// Converte as respostas da Flashforge para o "snapshot" neutro que o sistema entende (independente da marca).
// Tolerante: campo ausente, nulo ou de tipo diferente vira null; status desconhecido vira "desconhecido".
// Os nomes dos campos vêm da documentação comunitária (firmware AD5X 1.2.1) e DEVEM ser validados contra a
// resposta real da impressora: rode `npm run diagnostico` no notebook.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const inteiro = (v) => (num(v) === null ? null : Math.round(v))
const naoNegativo = (v) => (num(v) !== null && v >= 0 ? v : null)
const texto = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

// Valores de "status" listados na documentação para a AD5X. Estados fora desta lista caem em "desconhecido".
const ESTADOS = {
  ready: 'ociosa',
  completed: 'concluida',
  printing: 'imprimindo',
  pausing: 'imprimindo', // transição para pausa: ainda é o mesmo job
  heating: 'aquecendo',
  pause: 'pausada',
  canceling: 'cancelando',
  cancel: 'cancelada',
  error: 'erro',
  busy: 'ocupada',
  calibrate_doing: 'ocupada',
  downloading: 'ocupada',
}

export function normalizarEstado(status) {
  const bruto = texto(status)?.toLowerCase() ?? null
  return { estado: (bruto && ESTADOS[bruto]) || 'desconhecido', estadoBruto: bruto }
}

function temperatura(atual, alvo) {
  const a = num(atual)
  const t = num(alvo)
  return a === null && t === null ? null : { atual: a, alvo: t }
}

/** Câmara/segundo bico: na AD5X vêm zerados quando não existem; zero com alvo zero conta como "sem sensor". */
function temperaturaOpcional(atual, alvo) {
  const t = temperatura(atual, alvo)
  return t && (t.atual || t.alvo) ? t : null
}

export function normalizarDetalhe(d, medidoEm = new Date().toISOString()) {
  const { estado, estadoBruto } = normalizarEstado(d.status)

  // Documentação: printProgress é uma razão de 0 a 1. Defesa: se vier de 1 a 100, trata como porcentagem.
  let progresso = num(d.printProgress)
  if (progresso !== null && progresso > 1 && progresso <= 100) progresso /= 100
  if (progresso !== null) progresso = Math.min(1, Math.max(0, progresso))

  const erro = texto(d.errorCode)
  return {
    estado,
    estadoBruto,
    arquivo: texto(d.printFileName),
    progresso,
    camadaAtual: inteiro(d.printLayer),
    camadaTotal: inteiro(d.targetPrintLayer),
    decorridoSeg: naoNegativo(inteiro(d.printDuration)), // segundos decorridos do job
    restanteSeg: naoNegativo(inteiro(d.estimatedTime)), // segundos restantes (contagem regressiva)
    temperaturas: {
      bico: temperatura(d.leftTemp, d.leftTargetTemp),
      bicoDireito: temperaturaOpcional(d.rightTemp, d.rightTargetTemp),
      mesa: temperatura(d.platTemp, d.platTargetTemp),
      camara: temperaturaOpcional(d.chamberTemp, d.chamberTargetTemp),
    },
    codigoErro: erro && erro !== '0' ? erro : null,
    filamento: null, // preenchido pelo provider a partir de /gcodeList
    medidoEm,
  }
}

const mesmoArquivo = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
const nomeBase = (caminho) => caminho.split(/[\\/]/).pop()

/**
 * Procura o arquivo em impressão na lista e extrai o filamento ESTIMADO pelo fatiador (a API não informa o
 * consumo real). Devolve null se o arquivo não estiver na lista: nesse caso o custo de material fica manual.
 */
export function extrairFilamento(lista, arquivo) {
  if (!Array.isArray(lista) || !texto(arquivo)) return null
  const entrada =
    lista.find((e) => texto(e?.gcodeFileName) && mesmoArquivo(e.gcodeFileName, arquivo)) ??
    lista.find((e) => texto(e?.gcodeFileName) && mesmoArquivo(nomeBase(e.gcodeFileName), nomeBase(arquivo)))
  if (!entrada) return null

  const ferramentas = (Array.isArray(entrada.gcodeToolDatas) ? entrada.gcodeToolDatas : [])
    .filter((f) => f && typeof f === 'object')
    .map((f) => ({
      ferramenta: inteiro(f.toolId),
      material: texto(f.materialName),
      cor: typeof f.materialColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(f.materialColor) ? f.materialColor : null,
      gramas: naoNegativo(num(f.filamentWeight)),
      slot: inteiro(f.slotId) || null, // 0 = sem slot atribuído
    }))

  let gramas = naoNegativo(num(entrada.totalFilamentWeight))
  if (gramas === null) {
    const soma = ferramentas.reduce((acc, f) => acc + (f.gramas ?? 0), 0)
    gramas = soma > 0 ? soma : null
  }
  if (gramas === null && ferramentas.length === 0) return null
  return { gramasEstimadas: gramas, ferramentas }
}
