import { test } from 'node:test'
import assert from 'node:assert/strict'
import { processarSnapshot } from '../src/impressora/jobs.js'

// Monta um snapshot válido; `t` é o instante (em segundos desde o início do teste).
const T0 = Date.parse('2026-11-20T10:00:00.000Z')
const snap = (estado, t, extra = {}) => ({
  estado, arquivo: 'suporte.gcode', progresso: null, decorridoSeg: null, camadaTotal: null,
  filamento: null, medidoEm: new Date(T0 + t * 1000).toISOString(), ...extra,
})
// Aplica uma sequência de snapshots; devolve o job em andamento e todos os jobs finalizados.
function rodar(seq, jobInicial = null) {
  let job = jobInicial
  const finalizados = []
  for (const s of seq) {
    const r = processarSnapshot(job, s)
    job = r.jobAtual
    finalizados.push(...r.finalizados)
  }
  return { job, finalizados }
}

test('ociosa, concluida ou desconhecido sem job aberto não abre job', () => {
  for (const estado of ['ociosa', 'concluida', 'desconhecido', 'ocupada', 'erro']) {
    const { job, finalizados } = rodar([snap(estado, 0), snap(estado, 10)])
    assert.equal(job, null, estado)
    assert.equal(finalizados.length, 0, estado)
  }
})

test('job completo: aquece, imprime e conclui com a duração real', () => {
  const { job, finalizados } = rodar([
    snap('aquecendo', 0, { decorridoSeg: 0 }),
    snap('imprimindo', 60, { decorridoSeg: 55, progresso: 0.1, camadaTotal: 200, filamento: { gramasEstimadas: 12.5, ferramentas: [{ ferramenta: 0, material: 'PLA', cor: '#ff0000', gramas: 12.5, slot: 1 }] } }),
    snap('imprimindo', 3600, { decorridoSeg: 3595, progresso: 0.9 }),
    snap('concluida', 3900, { decorridoSeg: 3890, progresso: 1 }),
  ])
  assert.equal(job, null)
  assert.equal(finalizados.length, 1)
  const j = finalizados[0]
  assert.equal(j.resultado, 'concluido')
  assert.equal(j.duracaoSegundos, 3890)
  assert.equal(j.arquivo, 'suporte.gcode')
  assert.equal(j.camadaTotal, 200)
  assert.equal(j.gramasEstimadas, 12.5)
  assert.equal(j.materiais[0].material, 'PLA')
  assert.equal(j.inicioEstimado, false)
  assert.equal(j.iniciadoEm, new Date(T0).toISOString())
})

test('JOB CONCLUÍDO DUAS VEZES: o estado "concluida" repetido não registra um segundo job', () => {
  const { job, finalizados } = rodar([
    snap('imprimindo', 0, { decorridoSeg: 10 }),
    snap('concluida', 100, { decorridoSeg: 100, progresso: 1 }),
    snap('concluida', 107, { decorridoSeg: 100, progresso: 1 }), // a impressora fica em "concluida" até limpar
    snap('concluida', 114, { decorridoSeg: 100, progresso: 1 }),
    snap('ociosa', 200),
  ])
  assert.equal(job, null)
  assert.equal(finalizados.length, 1)
})

test('mesmo snapshot reenviado (retry do agente) não duplica nem altera o resultado', () => {
  const s1 = snap('imprimindo', 0, { decorridoSeg: 5, progresso: 0.01 })
  const s2 = snap('concluida', 50, { decorridoSeg: 50, progresso: 1 })
  const a = rodar([s1, s1, s1, s2, s2])
  assert.equal(a.finalizados.length, 1)
  assert.equal(a.finalizados[0].duracaoSegundos, 50)
})

test('REINÍCIO no meio do job: o job salvo é retomado com a mesma chave', () => {
  const parte1 = rodar([snap('imprimindo', 0, { decorridoSeg: 20 }), snap('imprimindo', 600, { decorridoSeg: 620, progresso: 0.4 })])
  // o servidor "reinicia": só o job em andamento persistido (JSON) sobrevive
  const salvo = JSON.parse(JSON.stringify(parte1.job))
  const parte2 = rodar([snap('imprimindo', 1200, { decorridoSeg: 1220, progresso: 0.8 }), snap('concluida', 1500, { decorridoSeg: 1500, progresso: 1 })], salvo)
  assert.equal(parte2.finalizados.length, 1)
  assert.equal(parte2.finalizados[0].chave, parte1.job.chave)
  assert.equal(parte2.finalizados[0].duracaoSegundos, 1500)
})

test('a chave do job é estável durante todo o job (não depende do instante de cada consulta)', () => {
  const r = rodar([snap('imprimindo', 0, { decorridoSeg: 3 }), snap('imprimindo', 30, { decorridoSeg: 33 }), snap('imprimindo', 61, { decorridoSeg: 64 })])
  const r1 = rodar([snap('imprimindo', 0, { decorridoSeg: 3 })])
  assert.equal(r.job.chave, r1.job.chave)
})

test('primeira vez que vê o job já em andamento: início é marcado como estimado', () => {
  const { job } = rodar([snap('imprimindo', 0, { decorridoSeg: 1800, progresso: 0.5 })])
  assert.equal(job.inicioEstimado, true)
  assert.equal(job.iniciadoEm, new Date(T0 - 1800 * 1000).toISOString())
})

test('volta a "ociosa" sem ter visto "concluida": concluído se passou de 98%, interrompido se não', () => {
  const a = rodar([snap('imprimindo', 0, { decorridoSeg: 10, progresso: 0.99 }), snap('ociosa', 30)])
  assert.equal(a.finalizados[0].resultado, 'concluido')
  const b = rodar([snap('imprimindo', 0, { decorridoSeg: 10, progresso: 0.3 }), snap('ociosa', 30)])
  assert.equal(b.finalizados[0].resultado, 'interrompido')
})

test('cancelamento: "cancelando" mantém o job aberto e "cancelada" encerra como cancelado', () => {
  const { job, finalizados } = rodar([snap('imprimindo', 0, { decorridoSeg: 10 }), snap('cancelando', 20, { decorridoSeg: 20 })])
  assert.ok(job)
  assert.equal(finalizados.length, 0)
  const fim = rodar([snap('cancelada', 30, { decorridoSeg: 25 })], job)
  assert.equal(fim.finalizados[0].resultado, 'cancelado')
  // e se só vir "ociosa" depois de cancelando, também é cancelado
  const alt = rodar([snap('ociosa', 40)], job)
  assert.equal(alt.finalizados[0].resultado, 'cancelado')
})

test('pausa e estados desconhecidos/ocupada não fecham o job', () => {
  const { job, finalizados } = rodar([snap('imprimindo', 0, { decorridoSeg: 10 }), snap('pausada', 20, { decorridoSeg: 20 }), snap('ocupada', 30), snap('desconhecido', 40), snap('imprimindo', 50, { decorridoSeg: 30 })])
  assert.ok(job)
  assert.equal(finalizados.length, 0)
})

test('erro encerra o job como "erro"', () => {
  const { job, finalizados } = rodar([snap('imprimindo', 0, { decorridoSeg: 100 }), snap('erro', 10, { decorridoSeg: 110 })])
  assert.equal(job, null)
  assert.equal(finalizados[0].resultado, 'erro')
})

test('mesmo arquivo impresso de novo (tempo decorrido recua): fecha o anterior e abre um job novo', () => {
  const { job, finalizados } = rodar([
    snap('imprimindo', 0, { decorridoSeg: 3000 }),
    snap('imprimindo', 7, { decorridoSeg: 5 }), // sem passar por "concluida"/"ociosa" entre as consultas
  ])
  assert.equal(finalizados.length, 1)
  assert.equal(finalizados[0].resultado, 'interrompido')
  assert.ok(job)
  assert.notEqual(job.chave, finalizados[0].chave)
})

test('arquivo diferente durante um job aberto: fecha o anterior e abre outro', () => {
  const { job, finalizados } = rodar([snap('imprimindo', 0, { decorridoSeg: 100 }), snap('imprimindo', 10, { decorridoSeg: 5, arquivo: 'outra.gcode' })])
  assert.equal(finalizados.length, 1)
  assert.equal(job.arquivo, 'outra.gcode')
})

test('sem tempo decorrido na conclusão: usa a diferença entre início e fim', () => {
  const { finalizados } = rodar([snap('imprimindo', 0), snap('concluida', 90)])
  assert.equal(finalizados[0].duracaoSegundos, 90)
})

test('dados de filamento: o primeiro valor encontrado é mantido', () => {
  const f1 = { gramasEstimadas: 10, ferramentas: [] }
  const f2 = { gramasEstimadas: 99, ferramentas: [] }
  const { finalizados } = rodar([snap('imprimindo', 0, { decorridoSeg: 1, filamento: f1 }), snap('imprimindo', 10, { decorridoSeg: 11, filamento: f2 }), snap('concluida', 20, { decorridoSeg: 20 })])
  assert.equal(finalizados[0].gramasEstimadas, 10)
})

test('o MESMO job visto em momentos diferentes gera a mesma chave (protege contra perda do job em andamento)', () => {
  // início real: 10:00:20. Cada consulta informa o tempo decorrido em segundos inteiros (truncado).
  const inicio = T0 + 20_000
  const vista = (tSeg, ms = 0) => {
    const medidoEm = new Date(T0 + tSeg * 1000 + ms)
    return snap('imprimindo', 0, { medidoEm: medidoEm.toISOString(), decorridoSeg: Math.floor((medidoEm.getTime() - inicio) / 1000) })
  }
  const chaves = [vista(25), vista(26, 900), vista(600, 400), vista(1799, 999), vista(3000, 1)].map((s) => processarSnapshot(null, s).jobAtual.chave)
  assert.equal(new Set(chaves).size, 1, chaves.join(' | '))
})

test('jobs do mesmo arquivo em horários diferentes têm chaves diferentes', () => {
  const a = processarSnapshot(null, snap('imprimindo', 0, { decorridoSeg: 5 })).jobAtual.chave
  const b = processarSnapshot(null, snap('imprimindo', 7200, { decorridoSeg: 5 })).jobAtual.chave
  assert.notEqual(a, b)
})
