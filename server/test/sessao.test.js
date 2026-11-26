import { test } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { criarSessao, lerConfigSessao, ErroSessao } from '../src/sessao.js'

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres-ok'
const USUARIO = '11111111-1111-4111-8111-111111111111'
// Relógio controlável: o teste "avança o tempo" sem esperar.
function relogio(inicio = 1_800_000_000) {
  let t = inicio
  return { agora: () => t, avancar: (s) => { t += s } }
}
const nova = (r, inatividadeSeg = 3600, maximaSeg = 12 * 3600) => criarSessao({ segredo: SEGREDO, inatividadeSeg, maximaSeg, agora: r.agora })
const codigoDe = (fn) => { try { fn() } catch (e) { return e.codigo ?? `outro:${e.message}` } return 'nenhum' }

test('token vale durante a janela de inatividade e expira depois dela', () => {
  const r = relogio(); const s = nova(r)
  const { token } = s.emitir(USUARIO)
  r.avancar(3599); assert.equal(s.verificar(token).sub, USUARIO)
  r.avancar(2); assert.equal(codigoDe(() => s.verificar(token)), 'auth/sessao-expirada')
})

test('o token expira por INATIVIDADE (60 min): sem renovar, cai', () => {
  const r = relogio(); const s = nova(r, 60 * 60)
  const { token, exp } = s.emitir(USUARIO)
  assert.equal(exp - r.agora(), 3600)
  r.avancar(3600); assert.equal(codigoDe(() => s.verificar(token)), 'auth/sessao-expirada')
})

test('RENOVAR estende a sessão a partir de agora (quem usa continua logado)', () => {
  const r = relogio(); const s = nova(r, 3600)
  let atual = s.emitir(USUARIO)
  for (let i = 0; i < 5; i++) { // 5 renovações a cada 50 min: 250 min de uso, bem além de 60 min
    r.avancar(50 * 60)
    const dados = s.verificar(atual.token) // ainda válido
    atual = s.renovar(dados)
  }
  assert.equal(s.verificar(atual.token).sub, USUARIO)
})

test('LIMITE MÁXIMO: mesmo renovando sempre, a sessão acaba após 12 h do login', () => {
  const r = relogio(); const s = nova(r, 3600, 12 * 3600)
  let atual = s.emitir(USUARIO)
  const inicio = r.agora()
  let renovacoes = 0
  while (true) {
    r.avancar(30 * 60)
    let dados
    try { dados = s.verificar(atual.token) } catch { break }
    try { atual = s.renovar(dados); renovacoes++ } catch { break }
    assert.ok(renovacoes < 100, 'não pode renovar para sempre')
  }
  assert.ok(r.agora() - inicio <= 12 * 3600 + 30 * 60, 'caiu na janela do limite máximo')
  assert.equal(codigoDe(() => s.verificar(atual.token)), 'auth/sessao-expirada')
})

test('a renovação nunca estende além do limite máximo (exp é limitado)', () => {
  const r = relogio(); const s = nova(r, 3600, 2 * 3600)
  const { token } = s.emitir(USUARIO); const inicio = r.agora()
  r.avancar(3000); const d1 = s.verificar(token); const t2 = s.renovar(d1)
  r.avancar(3000); const d2 = s.verificar(t2.token); const t3 = s.renovar(d2)
  assert.ok(t3.exp <= inicio + 2 * 3600)
  assert.equal(s.verificar(t3.token).inicio, inicio, 'o início do login é preservado nas renovações')
})

test('renovar depois do limite máximo é recusado', () => {
  const r = relogio(); const s = nova(r, 3600, 2 * 3600)
  const dados = { sub: USUARIO, inicio: r.agora() }
  r.avancar(2 * 3600)
  assert.equal(codigoDe(() => s.renovar(dados)), 'auth/sessao-expirada')
})

test('token ANTIGO (sem início de sessão, vida de 30 dias) é recusado como expirado', () => {
  const r = relogio(); const s = nova(r)
  // token no formato anterior: vida de 30 dias e SEM "sessaoInicio" (datado no relógio do teste, portanto ainda dentro da validade)
  const antigo = jwt.sign({ sub: USUARIO, iat: r.agora(), exp: r.agora() + 30 * 86400 }, SEGREDO)
  assert.equal(jwt.verify(antigo, SEGREDO, { clockTimestamp: r.agora() }).sub, USUARIO, 'o token antigo é válido para o JWT; só a regra de sessão o recusa')
  assert.equal(codigoDe(() => s.verificar(antigo)), 'auth/sessao-expirada')
})

test('token adulterado, de outro segredo ou lixo é inválido (não "expirado")', () => {
  const r = relogio(); const s = nova(r)
  const { token } = s.emitir(USUARIO)
  const partes = token.split('.')
  const adulterado = `${partes[0]}.${Buffer.from(JSON.stringify({ sub: 'outro', sessaoInicio: 1, exp: 9_999_999_999 })).toString('base64url')}.${partes[2]}`
  assert.equal(codigoDe(() => s.verificar(adulterado)), 'auth/unauthorized')
  const outroSegredo = jwt.sign({ sub: USUARIO, sessaoInicio: r.agora(), exp: r.agora() + 100 }, 'outro-segredo-qualquer-bem-grande-1234567890')
  assert.equal(codigoDe(() => s.verificar(outroSegredo)), 'auth/unauthorized')
  for (const lixo of ['', 'abc', 'a.b.c', null, undefined]) assert.equal(codigoDe(() => s.verificar(lixo)), 'auth/unauthorized', String(lixo))
})

test('token sem assinatura (alg none) é recusado', () => {
  const r = relogio(); const s = nova(r)
  const cab = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const corpo = Buffer.from(JSON.stringify({ sub: USUARIO, sessaoInicio: r.agora(), exp: r.agora() + 1000 })).toString('base64url')
  assert.equal(codigoDe(() => s.verificar(`${cab}.${corpo}.`)), 'auth/unauthorized')
})

test('o token carrega o início, o exp e a janela de inatividade (o front usa para renovar)', () => {
  const r = relogio(); const s = nova(r, 1800, 8 * 3600)
  const { token, exp, expiraEm } = s.emitir(USUARIO)
  const claims = jwt.decode(token)
  assert.equal(claims.sessaoInicio, r.agora())
  assert.equal(claims.idle, 1800)
  assert.equal(claims.exp, exp)
  assert.equal(new Date(expiraEm).getTime(), exp * 1000)
})

test('configuração: padrão 60 min / 12 h; valores do ambiente; validação', () => {
  assert.deepEqual(lerConfigSessao({}), { inatividadeSeg: 3600, maximaSeg: 43200 })
  assert.deepEqual(lerConfigSessao({ SESSAO_INATIVIDADE_MIN: '30', SESSAO_MAXIMA_HORAS: '8' }), { inatividadeSeg: 1800, maximaSeg: 28800 })
  assert.deepEqual(lerConfigSessao({ SESSAO_INATIVIDADE_MIN: '', SESSAO_MAXIMA_HORAS: ' ' }), { inatividadeSeg: 3600, maximaSeg: 43200 })
  assert.deepEqual(lerConfigSessao({ SESSAO_INATIVIDADE_MIN: '0.1', SESSAO_MAXIMA_HORAS: '0.01' }), { inatividadeSeg: 6, maximaSeg: 36 }) // tempos curtos para teste
  for (const ruim of [{ SESSAO_INATIVIDADE_MIN: '0' }, { SESSAO_INATIVIDADE_MIN: '-5' }, { SESSAO_INATIVIDADE_MIN: 'abc' }, { SESSAO_INATIVIDADE_MIN: '2000' }, { SESSAO_MAXIMA_HORAS: '0' }, { SESSAO_MAXIMA_HORAS: '9999' }, { SESSAO_MAXIMA_HORAS: 'x' }]) {
    assert.throws(() => lerConfigSessao(ruim), /SESSAO_/, JSON.stringify(ruim))
  }
  assert.throws(() => lerConfigSessao({ SESSAO_INATIVIDADE_MIN: '600', SESSAO_MAXIMA_HORAS: '5' }), /não pode ser maior/)
})

test('ErroSessao é reconhecível', () => {
  const r = relogio(); const s = nova(r)
  try { s.verificar('x') } catch (e) { assert.ok(e instanceof ErroSessao); return }
  assert.fail('deveria lançar')
})

test('versão da senha: vai no token, é preservada na renovação e identifica a senha vigente', () => {
  const r = relogio(); const s = nova(r)
  const t = s.emitir(USUARIO, undefined, 1_700_000_000_123)
  const dados = s.verificar(t.token)
  assert.equal(dados.versaoSenha, 1_700_000_000_123)
  assert.equal(s.verificar(s.renovar(dados).token).versaoSenha, 1_700_000_000_123, 'a renovação mantém a versão')
  assert.equal(s.verificar(s.emitir(USUARIO).token).versaoSenha, 0, 'sem troca de senha a versão é 0')
})

test('duas sessões emitidas no MESMO segundo, com versões de senha diferentes, ficam distinguíveis', () => {
  const r = relogio(); const s = nova(r)
  const antes = s.verificar(s.emitir(USUARIO, undefined, 0).token)
  const depois = s.verificar(s.emitir(USUARIO, undefined, 1_800_000_000_500).token)
  assert.equal(antes.iat, depois.iat, 'mesmo segundo de emissão (o caso que a comparação por horário não resolvia)')
  assert.notEqual(antes.versaoSenha, depois.versaoSenha)
})
