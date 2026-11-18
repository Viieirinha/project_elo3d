import { test } from 'node:test'
import assert from 'node:assert/strict'
import { executarAgente } from '../src/laco.js'
import { ErroServidor } from '../src/apiElo.js'
import { ErroImpressora } from '../src/providers/flashforge/erros.js'
import { criarLogger } from '../src/log.js'

const ALVO = { id: 'imp-1', provider: 'flashforge', ip: '192.168.0.50', porta: 8898, numeroSerie: 'SN1', ativa: true }
const SNAP = { estado: 'imprimindo', arquivo: 'a.gcode', medidoEm: '2026-11-20T10:00:00.000Z' }

// Executa o laço por `ciclos` ciclos sem esperar de verdade; devolve o que aconteceu.
async function rodar({ api, provider, ciclos = 1, aleatorio = () => 0.5 }) {
  const controle = new AbortController()
  const linhas = []
  const log = criarLogger({ saida: { log: (l) => linhas.push(l), error: (l) => linhas.push(l) } })
  const esperas = []
  const ciclosVistos = []
  await executarAgente({
    api, provider, log, sinal: controle.signal, aleatorio,
    esperar: async (ms) => { esperas.push(ms) },
    aoCiclo: (info) => { ciclosVistos.push(info); if (ciclosVistos.length >= ciclos) controle.abort() },
  })
  return { esperas, linhas, ciclosVistos }
}
const apiFalsa = (extra = {}) => {
  const chamadas = { config: 0, snapshots: [], falhas: [] }
  return {
    chamadas,
    obterConfig: async () => { chamadas.config++; return { impressora: ALVO } },
    enviarSnapshot: async (s) => { chamadas.snapshots.push(s); return { ok: true, proximoIntervaloMs: 7000, impressora: ALVO } },
    enviarFalha: async (f) => { chamadas.falhas.push(f); return { ok: true, proximoIntervaloMs: 30000, impressora: ALVO } },
    ...extra,
  }
}

test('fluxo normal: busca a configuração, consulta a impressora e envia; espera o ritmo do servidor', async () => {
  const api = apiFalsa()
  const consultados = []
  const provider = { obterSnapshot: async (alvo) => { consultados.push(alvo); return SNAP } }
  const r = await rodar({ api, provider, ciclos: 3 })
  assert.equal(api.chamadas.config, 1)
  assert.equal(api.chamadas.snapshots.length, 3)
  assert.deepEqual(r.esperas, [7000, 7000, 7000])
  assert.equal(consultados[0].ip, '192.168.0.50')
})

test('ritmo adaptativo: respeita o intervalo do servidor, limitado a 5 s e 120 s', async () => {
  for (const [pedido, esperado] of [[1000, 5000], [7000, 7000], [999999, 120000], [undefined, 30000]]) {
    const api = apiFalsa({ enviarSnapshot: async () => ({ ok: true, proximoIntervaloMs: pedido, impressora: ALVO }) })
    const r = await rodar({ api, provider: { obterSnapshot: async () => SNAP } })
    assert.equal(r.esperas[0], esperado, String(pedido))
  }
})

test('IMPRESSORA OFFLINE: avisa o servidor, recua em 5/10/20/40/60 s e não derruba o agente', async () => {
  const api = apiFalsa({ enviarFalha: async () => ({ ok: true, proximoIntervaloMs: 5000, impressora: ALVO }) })
  const provider = { obterSnapshot: async () => { throw new ErroImpressora('offline', 'A impressora não respondeu') } }
  const r = await rodar({ api, provider, ciclos: 7 })
  assert.deepEqual(r.esperas, [5000, 10000, 20000, 40000, 60000, 60000, 60000])
  assert.equal(r.ciclosVistos.at(-1).falhasImpressora, 7)
})

test('a falha é enviada ao servidor com o código certo (credencial/lan/firmware)', async () => {
  for (const codigo of ['credencial', 'lan', 'firmware', 'offline']) {
    const api = apiFalsa()
    await rodar({ api, provider: { obterSnapshot: async () => { throw new ErroImpressora(codigo, `msg ${codigo}`) } } })
    assert.equal(api.chamadas.falhas[0].codigo, codigo)
    assert.equal(api.chamadas.falhas[0].mensagem, `msg ${codigo}`)
  }
})

test('erro inesperado do provider vira falha "servico" sem expor detalhes internos', async () => {
  const api = apiFalsa()
  const r = await rodar({ api, provider: { obterSnapshot: async () => { throw new TypeError('x is not a function') } } })
  assert.equal(api.chamadas.falhas[0].codigo, 'servico')
  assert.equal(api.chamadas.falhas[0].mensagem.includes('x is not'), false)
  assert.ok(r.linhas.some((l) => l.includes('Erro inesperado')))
})

test('recuperação: ao voltar, zera o recuo e registra no log uma vez', async () => {
  let n = 0
  const provider = { obterSnapshot: async () => { if (++n <= 2) throw new ErroImpressora('offline', 'sem resposta'); return SNAP } }
  const api = apiFalsa()
  const r = await rodar({ api, provider, ciclos: 4 })
  assert.equal(r.ciclosVistos[3].falhasImpressora, 0)
  assert.equal(r.linhas.filter((l) => l.includes('sem resposta')).length, 1, 'a mesma falha não enche o log')
  assert.equal(r.linhas.filter((l) => l.includes('respondendo normalmente')).length, 1)
})

test('SERVIDOR FORA DO AR: recua e continua; não derruba o agente', async () => {
  const api = apiFalsa({ enviarSnapshot: async () => { throw new ErroServidor(0, 'Sem conexão com o servidor ELO 3D.') } })
  const r = await rodar({ api, provider: { obterSnapshot: async () => SNAP }, ciclos: 4 })
  assert.deepEqual(r.esperas, [5000, 10000, 20000, 40000])
  assert.equal(r.linhas.filter((l) => l.includes('Servidor ELO 3D')).length, 1)
})

test('configuração indisponível no início: tenta de novo com recuo', async () => {
  let n = 0
  const api = apiFalsa({ obterConfig: async () => { if (++n < 3) throw new ErroServidor(503, 'indisponível'); return { impressora: ALVO } } })
  const r = await rodar({ api, provider: { obterSnapshot: async () => SNAP }, ciclos: 3 })
  assert.deepEqual(r.esperas, [5000, 10000, 7000])
})

test('token do agente recusado (401): espera 60 s e orienta a gerar outro', async () => {
  const api = apiFalsa({ obterConfig: async () => { throw new ErroServidor(401, 'Token do agente inválido.') } })
  const r = await rodar({ api, provider: { obterSnapshot: async () => SNAP } })
  assert.deepEqual(r.esperas, [60000])
  assert.ok(r.linhas.some((l) => l.includes('Gere um novo')))
})

test('IP TROCADO na tela: o agente usa o IP novo já na consulta seguinte', async () => {
  let ip = '192.168.0.50'
  const api = apiFalsa({ enviarSnapshot: async () => ({ ok: true, proximoIntervaloMs: 7000, impressora: { ...ALVO, ip } }) })
  const consultados = []
  const provider = { obterSnapshot: async (alvo) => { consultados.push(alvo.ip); ip = '192.168.1.99'; return SNAP } }
  await rodar({ api, provider, ciclos: 3 })
  assert.deepEqual(consultados, ['192.168.0.50', '192.168.1.99', '192.168.1.99'])
})

test('impressora desativada no sistema: não consulta a impressora', async () => {
  const api = apiFalsa({ obterConfig: async () => ({ impressora: { ...ALVO, ativa: false } }) })
  let consultou = false
  const r = await rodar({ api, provider: { obterSnapshot: async () => { consultou = true; return SNAP } } })
  assert.equal(consultou, false)
  assert.deepEqual(r.esperas, [60000])
})

test('qualquer provider que siga a interface funciona (troca por Moonraker, etc.)', async () => {
  const outroProvider = { nome: 'moonraker', obterSnapshot: async () => ({ estado: 'ociosa', medidoEm: SNAP.medidoEm }) }
  const api = apiFalsa()
  await rodar({ api, provider: outroProvider })
  assert.equal(api.chamadas.snapshots[0].estado, 'ociosa')
})

test('encerra na hora quando o sinal é cancelado (sem esperar o intervalo)', async () => {
  const api = apiFalsa()
  const controle = new AbortController()
  const t0 = Date.now()
  const promessa = executarAgente({ api, provider: { obterSnapshot: async () => SNAP }, log: criarLogger({ saida: { log() {}, error() {} } }), sinal: controle.signal })
  setTimeout(() => controle.abort(), 80)
  await promessa // usa a espera real: o intervalo é de 7 s, mas o cancelamento a interrompe
  assert.ok(Date.now() - t0 < 1500)
})
