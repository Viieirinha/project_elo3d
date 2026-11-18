import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carregarConfig, lerEnv, ErroConfig } from '../src/config.js'
import { criarLogger } from '../src/log.js'
import { ipLocalValido, recuoMs } from '../src/rede.js'
import { criarProvider } from '../src/providers/provider.js'
import { CHECK_CODE } from './fixtures.js'

const TOKEN = 'elo3d_ag_abcdefghijklmnopqrstuvwxyz0123456789'
const env = { ELO_API_URL: 'https://elo3d.wmbens.cloud/', ELO_AGENT_TOKEN: TOKEN, FF_CHECK_CODE: CHECK_CODE }

test('configuração válida; a barra final da URL é removida', () => {
  const c = carregarConfig({ env })
  assert.equal(c.urlApi, 'https://elo3d.wmbens.cloud')
  assert.equal(c.checkCode, CHECK_CODE)
  assert.equal(c.timeoutMs, 4000)
})

test('exige https (exceto localhost) para o token não viajar sem criptografia', () => {
  assert.throws(() => carregarConfig({ env: { ...env, ELO_API_URL: 'http://elo3d.wmbens.cloud' } }), /https/)
  assert.doesNotThrow(() => carregarConfig({ env: { ...env, ELO_API_URL: 'http://localhost:3001' } }))
  assert.doesNotThrow(() => carregarConfig({ env: { ...env, ELO_API_URL: 'http://127.0.0.1:3001' } }))
})

test('lista TODOS os problemas e as mensagens não incluem os valores dos segredos', () => {
  try {
    carregarConfig({ env: { ELO_API_URL: '', ELO_AGENT_TOKEN: 'token-errado-SEGREDO', FF_CHECK_CODE: 'cod igo!SEGREDO' } })
    assert.fail('deveria falhar')
  } catch (e) {
    assert.ok(e instanceof ErroConfig)
    assert.match(e.message, /ELO_API_URL/)
    assert.match(e.message, /ELO_AGENT_TOKEN/)
    assert.match(e.message, /FF_CHECK_CODE/)
    assert.equal(e.message.includes('SEGREDO'), false)
  }
})

test('timeout fora da faixa é recusado', () => {
  assert.throws(() => carregarConfig({ env: { ...env, FF_TIMEOUT_MS: '10' } }), /FF_TIMEOUT_MS/)
})

test('diagnóstico sem servidor: só o checkCode é obrigatório', () => {
  const c = carregarConfig({ env: { FF_CHECK_CODE: CHECK_CODE }, exigirServidor: false })
  assert.equal(c.checkCode, CHECK_CODE)
})

test('lerEnv: comentários, aspas, espaços e linhas inválidas', () => {
  const r = lerEnv('# comentário\nA=1\n B = "dois" \nC=\'três\'\nSEMIGUAL\n=vazio\nD=a=b\r\n')
  assert.deepEqual(r, { A: '1', B: 'dois', C: 'três', D: 'a=b' })
})

test('variável de ambiente tem prioridade sobre o arquivo .env', () => {
  const c = carregarConfig({ env: { ...env, FF_CHECK_CODE: 'ffff0000' } })
  assert.equal(c.checkCode, 'ffff0000')
})

test('LOG: checkCode e token são ocultados em qualquer mensagem', () => {
  const linhas = []
  const log = criarLogger({ segredos: [CHECK_CODE, TOKEN], saida: { log: (l) => linhas.push(l), error: (l) => linhas.push(l) } })
  log.info(`consulta com checkCode=${CHECK_CODE}`)
  log.erro(`falha: {"checkCode":"${CHECK_CODE}"} Bearer ${TOKEN}`)
  log.aviso(`${CHECK_CODE}${CHECK_CODE}`)
  const todo = linhas.join('\n')
  assert.equal(todo.includes(CHECK_CODE), false)
  assert.equal(todo.includes(TOKEN), false)
  assert.ok(todo.includes('***'))
  assert.equal(log.ocultar(`x ${CHECK_CODE} y`), 'x *** y')
})

test('rede: IPs locais aceitos, públicos e inválidos recusados', () => {
  for (const ok of ['192.168.1.20', '10.1.2.3', '172.20.0.9']) assert.equal(ipLocalValido(ok), true)
  for (const ruim of ['8.8.8.8', '192.168.1', 'a.b.c.d', '172.40.0.1', undefined]) assert.equal(ipLocalValido(ruim), false)
})

test('recuo: 0 sem falhas, dobra até o teto de 60 s, com variação de 10%', () => {
  assert.equal(recuoMs(0), 0)
  assert.deepEqual([1, 2, 3, 4, 5, 6, 20].map((n) => recuoMs(n, () => 0.5)), [5000, 10000, 20000, 40000, 60000, 60000, 60000])
  assert.equal(recuoMs(1, () => 0), 4500)
  assert.equal(recuoMs(1, () => 1), 5500)
})

test('provider: modelo desconhecido dá erro claro; flashforge é criado', () => {
  assert.throws(() => criarProvider('inexistente', {}), /não suportado/)
  assert.equal(criarProvider('flashforge', { checkCode: CHECK_CODE }).nome, 'flashforge')
})
