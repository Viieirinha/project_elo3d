// Testes de integração com o PostgreSQL. Rodam só se DATABASE_URL estiver definido (senão são pulados).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'

const TEM_BANCO = Boolean(process.env.DATABASE_URL)
const opcoes = { skip: TEM_BANCO ? false : 'defina DATABASE_URL para rodar os testes com banco' }

const { pool, tx } = TEM_BANCO ? await import('../src/db.js') : {}
const svc = TEM_BANCO ? await import('../src/impressora/servico.js') : {}
const { validarSnapshot } = await import('../src/impressora/validacao.js')

const T0 = Date.parse('2026-11-20T10:00:00.000Z')
const snap = (estado, t, extra = {}) => validarSnapshot({ estado, arquivo: 'peca.gcode', medidoEm: new Date(T0 + t * 1000).toISOString(), ...extra }, new Date(T0 + 86_400_000))
const criadas = []
async function novaImpressora(extra = {}) {
  const r = await tx((c) => svc.criarImpressora(c, { nome: 'AD5X teste', ip: '192.168.0.50', numeroSerie: `SN${Math.random().toString(36).slice(2, 10)}`, ...extra }))
  criadas.push(r.impressora.id)
  return r
}
const contarJobs = async (id) => (await pool.query('SELECT count(*)::int AS n FROM impressao_jobs WHERE impressora_id = $1', [id])).rows[0].n
const enviar = (id, s) => tx((c) => svc.registrarSnapshot(c, id, s))

after(async () => {
  if (!TEM_BANCO) return
  for (const id of criadas) await pool.query('DELETE FROM impressoras WHERE id = $1', [id])
  await pool.end()
})

test('cadastro: o token é devolvido uma vez e só o hash fica no banco', opcoes, async () => {
  const { impressora, token } = await novaImpressora()
  assert.match(token, /^elo3d_ag_/)
  assert.equal('tokenHash' in impressora, false)
  assert.equal(impressora.temToken, true)
  const linha = (await pool.query('SELECT token_hash FROM impressoras WHERE id = $1', [impressora.id])).rows[0]
  assert.notEqual(linha.token_hash, token)
  assert.equal(linha.token_hash.includes(token), false)
  const lista = await svc.listarImpressoras(pool)
  assert.equal(JSON.stringify(lista).includes(token), false)
  assert.equal(JSON.stringify(lista).includes('token_hash'), false)
  assert.equal(JSON.stringify(lista).includes('tokenHash'), false)
})

test('agente é identificado pelo token; token errado, vazio ou de outro formato não passa', opcoes, async () => {
  const { impressora, token } = await novaImpressora()
  assert.equal((await svc.resolverAgente(pool, token)).id, impressora.id)
  for (const ruim of ['', 'elo3d_ag_errado', 'Bearer x', null, undefined, 'x'.repeat(500)]) assert.equal(await svc.resolverAgente(pool, ruim), null, String(ruim))
})

test('regenerar o token invalida o anterior', opcoes, async () => {
  const { impressora, token } = await novaImpressora()
  const novo = await tx((c) => svc.regenerarToken(c, impressora.id))
  assert.equal(await svc.resolverAgente(pool, token), null)
  assert.equal((await svc.resolverAgente(pool, novo.token)).id, impressora.id)
})

test('IP editável: a configuração do agente reflete o IP novo', opcoes, async () => {
  const { impressora, token } = await novaImpressora()
  await tx((c) => svc.atualizarImpressora(c, impressora.id, { ip: '192.168.1.77' }))
  assert.equal((await svc.resolverAgente(pool, token)).ip, '192.168.1.77')
  await assert.rejects(tx((c) => svc.atualizarImpressora(c, impressora.id, { ip: '8.8.8.8' })), { status: 400 })
  await assert.rejects(tx((c) => svc.atualizarImpressora(c, impressora.id, { ip: 'impressora.local' })), { status: 400 })
  assert.equal((await svc.resolverAgente(pool, token)).ip, '192.168.1.77')
})

test('cadastro recusa IP público, série inválida e modelo desconhecido', opcoes, async () => {
  await assert.rejects(tx((c) => svc.criarImpressora(c, { nome: 'x', ip: '1.1.1.1', numeroSerie: 'AB12' })), { status: 400 })
  await assert.rejects(tx((c) => svc.criarImpressora(c, { nome: 'x', ip: '192.168.0.2', numeroSerie: 'AB 12; DROP' })), { status: 400 })
  await assert.rejects(tx((c) => svc.criarImpressora(c, { nome: 'x', ip: '192.168.0.2', numeroSerie: 'AB12', provider: 'outra' })), { status: 400 })
  await assert.rejects(tx((c) => svc.criarImpressora(c, { nome: '', ip: '192.168.0.2', numeroSerie: 'AB12' })), { status: 400 })
})

test('job concluído é registrado uma vez, mesmo com "concluida" repetido', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 10, filamento: { gramasEstimadas: 8.4, ferramentas: [] } }))
  await enviar(impressora.id, snap('concluida', 600, { decorridoSeg: 590, progresso: 1 }))
  await enviar(impressora.id, snap('concluida', 607, { decorridoSeg: 590, progresso: 1 }))
  await enviar(impressora.id, snap('ociosa', 700))
  assert.equal(await contarJobs(impressora.id), 1)
  const [job] = await svc.listarJobs(pool, { impressoraId: impressora.id })
  assert.equal(job.duracaoSegundos, 590)
  assert.equal(job.resultado, 'concluido')
  assert.equal(Number(job.gramasEstimadas), 8.4)
})

test('DUAS consultas simultâneas do agente não duplicam o job (bloqueio de linha)', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 10 }))
  const fim = snap('concluida', 300, { decorridoSeg: 300, progresso: 1 })
  await Promise.all([1, 2, 3, 4, 5].map(() => enviar(impressora.id, fim)))
  assert.equal(await contarJobs(impressora.id), 1)
})

test('perda do job em andamento: o mesmo job visto de novo não vira registro duplicado (UNIQUE)', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 15 }))
  await enviar(impressora.id, snap('concluida', 200, { decorridoSeg: 200, progresso: 1 }))
  assert.equal(await contarJobs(impressora.id), 1)
  // simula o job ter sido "esquecido" e o agente reenviar o mesmo job: o início estimado coincide (mesma chave)
  await pool.query('UPDATE impressora_estado SET job_atual = NULL WHERE impressora_id = $1', [impressora.id])
  await enviar(impressora.id, snap('imprimindo', 100, { decorridoSeg: 115 }))
  await enviar(impressora.id, snap('concluida', 200, { decorridoSeg: 200, progresso: 1 }))
  assert.equal(await contarJobs(impressora.id), 1)
})

test('reinício do servidor no meio do job: o job em andamento persiste no banco', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 30, progresso: 0.05 }))
  const salvo = (await pool.query('SELECT job_atual FROM impressora_estado WHERE impressora_id = $1', [impressora.id])).rows[0].job_atual
  assert.equal(salvo.arquivo, 'peca.gcode')
  await enviar(impressora.id, snap('concluida', 900, { decorridoSeg: 900, progresso: 1 }))
  assert.equal(await contarJobs(impressora.id), 1)
  assert.equal((await pool.query('SELECT job_atual FROM impressora_estado WHERE impressora_id = $1', [impressora.id])).rows[0].job_atual, null)
})

test('falha (offline/credencial) guarda o erro, mantém o último estado e o job aberto', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 30 }))
  await tx((c) => svc.registrarFalha(c, impressora.id, { codigo: 'offline', mensagem: 'sem resposta' }))
  const e = await tx((c) => svc.obterEstado(c, impressora.id))
  assert.equal(e.erro.codigo, 'offline')
  assert.equal(e.snapshot.estado, 'imprimindo') // último estado conhecido preservado
  assert.equal(e.jobAtual.arquivo, 'peca.gcode')
  assert.equal(await contarJobs(impressora.id), 0)
  await enviar(impressora.id, snap('imprimindo', 60, { decorridoSeg: 90 }))
  assert.equal((await tx((c) => svc.obterEstado(c, impressora.id))).erro, null) // limpou ao voltar
})

test('ritmo de consulta: rápido com job aberto ou tela aberta, lento quando ocioso', opcoes, async () => {
  const { impressora } = await novaImpressora()
  const ocioso = await enviar(impressora.id, snap('ociosa', 0))
  assert.equal(ocioso.proximoIntervaloMs, 30_000)
  await tx((c) => svc.obterEstado(c, impressora.id)) // alguém abriu a tela
  assert.equal((await enviar(impressora.id, snap('ociosa', 10))).proximoIntervaloMs, 7_000)
  await pool.query('UPDATE impressora_estado SET ui_visto_em = now() - interval \'10 minutes\' WHERE impressora_id = $1', [impressora.id])
  assert.equal((await enviar(impressora.id, snap('ociosa', 20))).proximoIntervaloMs, 30_000)
  assert.equal((await enviar(impressora.id, snap('imprimindo', 30, { decorridoSeg: 5 }))).proximoIntervaloMs, 7_000)
})

test('vínculo do job com produto e observação; produto inválido é recusado', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 5 }))
  await enviar(impressora.id, snap('concluida', 100, { decorridoSeg: 100, progresso: 1 }))
  const [job] = await svc.listarJobs(pool, { impressoraId: impressora.id })
  const produtoId = '11111111-1111-4111-8111-111111111111'
  const a = await tx((c) => svc.atualizarJob(c, job.id, { produtoId, observacoes: '  teste  ' }))
  assert.equal(a.produtoId, produtoId)
  assert.equal(a.observacoes, 'teste')
  const b = await tx((c) => svc.atualizarJob(c, job.id, { produtoId: null }))
  assert.equal(b.produtoId, null)
  await assert.rejects(tx((c) => svc.atualizarJob(c, job.id, { produtoId: 'xyz' })), { status: 400 })
  await assert.rejects(tx((c) => svc.atualizarJob(c, job.id, {})), { status: 400 })
})

test('apagar a impressora apaga estado e jobs (cascata)', opcoes, async () => {
  const { impressora } = await novaImpressora()
  await enviar(impressora.id, snap('imprimindo', 0, { decorridoSeg: 5 }))
  await enviar(impressora.id, snap('concluida', 50, { decorridoSeg: 50, progresso: 1 }))
  await tx((c) => svc.removerImpressora(c, impressora.id))
  assert.equal(await contarJobs(impressora.id), 0)
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM impressora_estado WHERE impressora_id = $1', [impressora.id])).rows[0].n, 0)
})
