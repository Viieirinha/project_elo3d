import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ipLocalValido, ESTADOS_IMPRESSORA, MENSAGENS_ERRO_IMPRESSORA } from './impressora.js'
import { tempoRelativo } from './tempo.js'

test('IP: só rede local', () => {
  for (const ok of ['192.168.0.50', ' 10.0.0.7 ', '172.16.5.5']) assert.equal(ipLocalValido(ok), true, ok)
  for (const ruim of ['8.8.8.8', '192.168.0', 'impressora.local', '', null, '192.168.0.1:8898', '999.1.1.1']) assert.equal(ipLocalValido(ruim), false, String(ruim))
})

test('todo estado que o agente pode enviar tem rótulo na tela, e todo erro tem orientação', () => {
  for (const e of ['ociosa', 'imprimindo', 'aquecendo', 'pausada', 'erro', 'ocupada', 'concluida', 'cancelando', 'cancelada', 'desconhecido']) assert.ok(ESTADOS_IMPRESSORA[e]?.rotulo, e)
  for (const c of ['offline', 'credencial', 'lan', 'firmware', 'servico']) assert.ok(MENSAGENS_ERRO_IMPRESSORA[c].length > 20, c)
})

test('tempo relativo', () => {
  const agora = Date.parse('2026-11-20T12:00:00Z')
  const antes = (s) => new Date(agora - s * 1000).toISOString()
  assert.equal(tempoRelativo(antes(2), agora), 'agora')
  assert.equal(tempoRelativo(antes(30), agora), 'há 30 s')
  assert.equal(tempoRelativo(antes(300), agora), 'há 5 min')
  assert.equal(tempoRelativo(antes(7300), agora), 'há 2 h')
  assert.equal(tempoRelativo(antes(86400), agora), 'há 1 dia')
  assert.equal(tempoRelativo(antes(3 * 86400), agora), 'há 3 dias')
  assert.equal(tempoRelativo(null, agora), null)
  assert.equal(tempoRelativo('lixo', agora), null)
})
