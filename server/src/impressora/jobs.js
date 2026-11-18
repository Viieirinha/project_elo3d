// Detecção de início e conclusão de jobs de impressão a partir de "snapshots" normalizados.
//
// É uma função PURA: recebe o job em andamento (o que está salvo no banco) e o snapshot novo, e devolve o
// novo job em andamento mais os jobs que terminaram. Não acessa banco nem relógio, então é testável e
// idempotente: o mesmo snapshot repetido não gera nada novo, e o job em andamento é persistido pelo chamador,
// o que permite reiniciar o servidor no meio de uma impressão sem duplicar nem perder o job.
//
// Observação sobre a API da impressora: ela NÃO informa ID nem hora de início do job. A chave do job é
// "arquivo + início estimado (medidoEm - tempo decorrido)", calculada UMA vez ao abrir o job e mantida até o fim.

/** Estados em que a impressora está trabalhando num job. */
export const ESTADOS_ATIVOS = ['imprimindo', 'aquecendo', 'pausada']

const PROGRESSO_CONCLUIDO = 0.98 // acima disto, uma volta a "ociosa" conta como job concluído
const SALTO_DE_NOVO_JOB_SEG = 120 // o tempo decorrido recuar mais que isto indica um job novo (mesmo arquivo)
const INICIO_PRECISO_SEG = 90 // viu o job nos primeiros 90 s: o início é preciso; depois disso é estimado

const iso = (d) => d.toISOString()
// Precisão de MINUTO: o tempo decorrido da impressora é inteiro (oscila ±1 s entre consultas), então o início
// estimado do MESMO job pode variar um pouco; um job novo do mesmo arquivo nunca começa no mesmo minuto.
const chaveDe = (arquivo, iniciadoEm) => `${arquivo}|${iniciadoEm.toISOString().slice(0, 16)}Z`

function abrirJob(snap, medidoEm) {
  const decorrido = snap.decorridoSeg ?? 0
  const iniciadoEm = new Date(medidoEm.getTime() - decorrido * 1000)
  const arquivo = snap.arquivo || '(sem nome)'
  return {
    chave: chaveDe(arquivo, iniciadoEm),
    arquivo,
    iniciadoEm: iso(iniciadoEm),
    inicioEstimado: decorrido > INICIO_PRECISO_SEG,
    ultimoDecorridoSeg: decorrido,
    ultimoProgresso: snap.progresso ?? 0,
    camadaTotal: snap.camadaTotal ?? null,
    filamento: snap.filamento ?? null,
    viuCancelamento: false,
    ultimoVistoEm: iso(medidoEm),
  }
}

function atualizarJob(job, snap, medidoEm) {
  return {
    ...job,
    ultimoDecorridoSeg: Math.max(job.ultimoDecorridoSeg, snap.decorridoSeg ?? 0),
    ultimoProgresso: snap.progresso ?? job.ultimoProgresso,
    camadaTotal: snap.camadaTotal ?? job.camadaTotal,
    filamento: job.filamento ?? snap.filamento ?? null, // o primeiro dado de filamento encontrado vale
    viuCancelamento: job.viuCancelamento || snap.estado === 'cancelando',
    ultimoVistoEm: iso(medidoEm),
  }
}

function finalizarJob(job, resultado, snap, medidoEm) {
  const iniciado = new Date(job.iniciadoEm)
  let duracao = Math.max(job.ultimoDecorridoSeg, snap.decorridoSeg ?? 0)
  if (!(duracao > 0)) duracao = Math.max(0, Math.round((medidoEm.getTime() - iniciado.getTime()) / 1000))
  const materiais = job.filamento?.ferramentas ?? null
  return {
    chave: job.chave,
    arquivo: job.arquivo,
    iniciadoEm: job.iniciadoEm,
    inicioEstimado: job.inicioEstimado,
    concluidoEm: iso(medidoEm),
    duracaoSegundos: Math.round(duracao),
    resultado,
    camadaTotal: job.camadaTotal,
    gramasEstimadas: job.filamento?.gramasEstimadas ?? null,
    materiais,
  }
}

/**
 * @param {object|null} jobAtual job em andamento salvo (ou null)
 * @param {object} snap snapshot validado (ver validacao.js)
 * @returns {{ jobAtual: object|null, finalizados: object[] }}
 */
export function processarSnapshot(jobAtual, snap) {
  const medidoEm = new Date(snap.medidoEm)
  const ativo = ESTADOS_ATIVOS.includes(snap.estado)
  const finalizados = []

  if (!jobAtual) {
    // Só um estado ATIVO abre job. "concluida" repetido (a impressora fica nesse estado até alguém limpar)
    // não abre nada: é isso que impede registrar o mesmo job duas vezes.
    return { jobAtual: ativo ? abrirJob(snap, medidoEm) : null, finalizados }
  }

  // Job novo do mesmo arquivo (ou outro arquivo) sem termos visto o fim do anterior.
  const arquivoMudou = ativo && snap.arquivo && snap.arquivo !== jobAtual.arquivo
  const tempoRecuou = ativo && snap.decorridoSeg != null && snap.decorridoSeg < jobAtual.ultimoDecorridoSeg - SALTO_DE_NOVO_JOB_SEG
  if (arquivoMudou || tempoRecuou) {
    finalizados.push(finalizarJob(jobAtual, 'interrompido', {}, new Date(jobAtual.ultimoVistoEm)))
    return { jobAtual: abrirJob(snap, medidoEm), finalizados }
  }

  const job = atualizarJob(jobAtual, snap, medidoEm)

  switch (snap.estado) {
    case 'concluida':
      finalizados.push(finalizarJob(job, 'concluido', snap, medidoEm))
      return { jobAtual: null, finalizados }
    case 'cancelada':
      finalizados.push(finalizarJob(job, 'cancelado', snap, medidoEm))
      return { jobAtual: null, finalizados }
    case 'erro':
      finalizados.push(finalizarJob(job, 'erro', snap, medidoEm))
      return { jobAtual: null, finalizados }
    case 'ociosa': {
      // Voltou ao repouso sem termos visto "concluida" (o intervalo entre consultas pode pular esse estado).
      const resultado = job.viuCancelamento ? 'cancelado' : job.ultimoProgresso >= PROGRESSO_CONCLUIDO ? 'concluido' : 'interrompido'
      finalizados.push(finalizarJob(job, resultado, snap, medidoEm))
      return { jobAtual: null, finalizados }
    }
    default:
      // imprimindo, aquecendo, pausada, cancelando, ocupada, desconhecido: o job segue aberto.
      return { jobAtual: job, finalizados }
  }
}
