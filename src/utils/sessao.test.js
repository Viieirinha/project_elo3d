import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerSessao, deveRenovar, expirou, intervaloDeVerificacao } from './sessao.js'

// Monta um token no formato do servidor (a assinatura não importa: o navegador só lê as datas).
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = (claims) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.assinatura`

test('lê início, expiração e janela de inatividade (em ms)', () => {
  const s = lerSessao(token({ sub: 'u', sessaoInicio: 1000, idle: 3600, exp: 4600, iat: 1000 }))
  assert.deepEqual(s, { exp: 4_600_000, inicio: 1_000_000, idleMs: 3_600_000 })
})

test('token sem "idle" assume 60 min; sem "sessaoInicio" usa iat', () => {
  const s = lerSessao(token({ iat: 500, exp: 900 }))
  assert.equal(s.idleMs, 3_600_000)
  assert.equal(s.inicio, 500_000)
})

test('token ilegível, sem exp ou vazio -> null (nunca lança)', () => {
  for (const ruim of ['', 'abc', 'a.b.c', null, undefined, token({ sub: 'x' }), 'a.!!!.c', 42]) assert.equal(lerSessao(ruim), null, String(ruim))
})

test('lê tokens com caracteres acentuados no corpo', () => {
  assert.equal(lerSessao(token({ nome: 'João Pêra', exp: 100 })).exp, 100_000)
})

test('expirou: exatamente no instante de expiração já conta', () => {
  assert.equal(expirou(1000, 1000), true)
  assert.equal(expirou(999, 1000), false)
})

const H = 3_600_000 // janela de 60 min
const base = { exp: 10 * H, idleMs: H }
test('só renova com ATIVIDADE do usuário desde a última renovação', () => {
  const agora = 10 * H - 0.5 * H // restam 30 min (< 40 min)
  assert.equal(deveRenovar({ ...base, agora, ultimaAtividade: agora - 1000, ultimaRenovacao: agora - 0.5 * H }), true)
  assert.equal(deveRenovar({ ...base, agora, ultimaAtividade: agora - 0.6 * H, ultimaRenovacao: agora - 0.5 * H }), false, 'sem atividade nova: não renova (aba esquecida)')
})

test('não renova cedo demais (antes de consumir 1/3 da janela)', () => {
  const agora = 10 * H - 0.8 * H // restam 48 min (> 40 min)
  assert.equal(deveRenovar({ ...base, agora, ultimaAtividade: agora, ultimaRenovacao: agora - 0.5 * H }), false)
})

test('não renova se já expirou, nem repete a renovação a cada verificação', () => {
  assert.equal(deveRenovar({ ...base, agora: 10 * H + 1, ultimaAtividade: 10 * H, ultimaRenovacao: 0 }), false)
  const agora = 10 * H - 0.5 * H
  assert.equal(deveRenovar({ ...base, agora, ultimaAtividade: agora, ultimaRenovacao: agora - 1000 }), false, 'renovou há 1 s: espera')
})

test('uso contínuo ao longo de horas: renova ~1 vez a cada 20 min (não a cada verificação)', () => {
  let exp = H, ultimaRenovacao = 0, renovacoes = 0
  for (let t = 0; t < 5 * H; t += 10_000) { // verifica a cada 10 s, com o usuário sempre ativo
    if (deveRenovar({ agora: t, exp, idleMs: H, ultimaAtividade: t, ultimaRenovacao })) { exp = t + H; ultimaRenovacao = t; renovacoes++ }
    assert.ok(t < exp, `a sessão não pode expirar com o usuário ativo (t=${t / 60000} min)`)
  }
  assert.ok(renovacoes >= 12 && renovacoes <= 16, `renovações em 5 h: ${renovacoes}`)
})

test('abandonado (sem atividade): nunca renova e expira ao fim da janela', () => {
  let exp = H, ultimaRenovacao = 0, renovou = false
  for (let t = 0; t < 2 * H; t += 10_000) if (deveRenovar({ agora: t, exp, idleMs: H, ultimaAtividade: 0, ultimaRenovacao })) renovou = true
  assert.equal(renovou, false)
  assert.equal(expirou(H, exp), true)
})

test('intervalo de verificação proporcional à janela, entre 1 s e 10 s', () => {
  assert.equal(intervaloDeVerificacao(3_600_000), 10_000)
  assert.equal(intervaloDeVerificacao(6_000), 1_000)
  assert.equal(intervaloDeVerificacao(30_000), 5_000)
})
