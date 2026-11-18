import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularResultado } from './calculo.js'
import { parseLocaleNumber as P } from './format.js'

// Fórmula ORIGINAL da calculadora (antes da extração para calculo.js e da depreciação).
// O modo "peça única" deve continuar dando EXATAMENTE os mesmos valores.
function antigo(form, margem) {
  const quantidadePecas = Math.max(1, P(form.quantidadePecas) || 1)
  const filamentos = form.filamentos.map((f) => ({ precoRolo: P(f.precoRolo), pesoRolo: P(f.pesoRolo), filamentoUsado: P(f.filamentoUsado) / quantidadePecas, pesoRoloTexto: f.pesoRolo }))
  const consumoW = P(form.consumoW), horas = P(form.horas), minutos = P(form.minutos), valorKwh = P(form.valorKwh)
  const custoFixo = P(form.custoFixo), maoDeObra = P(form.maoDeObra)
  const t = (horas + minutos / 60) / quantidadePecas
  const custoFilamento = filamentos.reduce((a, f) => a + (f.pesoRolo > 0 ? (f.precoRolo / f.pesoRolo) * f.filamentoUsado : 0), 0)
  const g = filamentos.reduce((a, f) => a + f.filamentoUsado, 0)
  const custoEnergia = t > 0 ? (consumoW / 1000) * t * valorKwh : 0
  const custoTotal = custoFilamento + custoEnergia + custoFixo + maoDeObra
  return {
    custoFilamento, custoEnergia, custoTotal, precoVenda: custoTotal * (1 + margem / 100), custoPorGrama: g > 0 ? custoTotal / g : 0, custoPorHora: t > 0 ? custoTotal / t : 0,
    hasError: filamentos.some((f) => f.pesoRoloTexto.trim() !== '' && f.pesoRolo <= 0) || ((form.horas.trim() !== '' || form.minutos.trim() !== '') && t <= 0),
  }
}
const base = (o = {}) => ({ quantidadePecas: '1', filamentos: [{ id: 'a', precoRolo: '120', pesoRolo: '1000', filamentoUsado: '20' }], consumoW: '200', horas: '2', minutos: '30', valorKwh: '0,83', custoFixo: '', maoDeObra: '', modoPartes: false, partes: [], ...o })
const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`)

test('peça única idêntica à fórmula antiga (todas as combinações de teste)', () => {
  const casos = [
    base(), base({ quantidadePecas: '4', filamentoUsado: '80' }), base({ horas: '', minutos: '' }), base({ custoFixo: '3,5', maoDeObra: '10' }),
    base({ filamentos: [{ id: 'a', precoRolo: '120', pesoRolo: '1000', filamentoUsado: '20' }, { id: 'b', precoRolo: '99,9', pesoRolo: '750', filamentoUsado: '7,5' }] }),
    base({ filamentos: [{ id: 'a', precoRolo: '120', pesoRolo: '0', filamentoUsado: '20' }] }), base({ horas: '0', minutos: '0' }), base({ quantidadePecas: '' }),
  ]
  for (const margem of [0, 40, 100, 1500]) {
    for (const c of casos) {
      const n = calcularResultado(c, margem), a = antigo(c, margem)
      for (const k of Object.keys(a)) assert.equal(n[k], a[k], `${k} difere (margem ${margem})`)
    }
  }
})

test('depreciação vazia ou zero NÃO altera nada (mesmos valores do modo antigo)', () => {
  for (const dep of [undefined, '', '0', '0,00']) {
    const c = base({ depreciacaoHora: dep })
    assert.equal(calcularResultado(c, 100).custoTotal, antigo(c, 100).custoTotal)
    assert.equal(calcularResultado(c, 100).custoDepreciacao, 0)
  }
})

test('depreciação = R$/h x horas de impressão, somada ao custo total', () => {
  const r = calcularResultado(base({ depreciacaoHora: '3' }), 100) // 2,5 h x R$ 3
  perto(r.custoDepreciacao, 7.5, 'depreciação')
  perto(r.custoTotal, antigo(base(), 100).custoTotal + 7.5, 'total')
})

test('depreciação em lote é dividida pelas peças (como o tempo)', () => {
  const r = calcularResultado(base({ quantidadePecas: '5', depreciacaoHora: '3' }), 100)
  perto(r.custoDepreciacao, (2.5 / 5) * 3, 'por peça')
})

test('depreciação sem tempo informado não gera custo (nem NaN)', () => {
  const r = calcularResultado(base({ horas: '', minutos: '', depreciacaoHora: '3' }), 100)
  assert.equal(r.custoDepreciacao, 0)
  assert.ok(Number.isFinite(r.custoTotal))
})

const f = (o) => ({ id: 'x', nome: '', quantidade: '1', gramas: '', filamentoId: 'a', horas: '', minutos: '', ...o })
const objeto = (o = {}) => base({
  modoPartes: true, custoFixo: '2', maoDeObra: '8',
  filamentos: [{ id: 'a', nome: 'Branco', precoRolo: '100', pesoRolo: '1000', filamentoUsado: '' }, { id: 'b', nome: 'Preto', precoRolo: '200', pesoRolo: '1000', filamentoUsado: '' }],
  partes: [f({ id: '1', nome: 'Base', gramas: '50', horas: '3', filamentoId: 'a' }), f({ id: '2', nome: 'Tampa', quantidade: '2', gramas: '10', minutos: '30', filamentoId: 'b' })], ...o,
})

test('objeto com partes: a soma das partes fecha com o total do objeto (custo e preço)', () => {
  const r = calcularResultado(objeto(), 100)
  perto(r.custoFilamento, 5 + 2 * 2, 'filamento')
  perto(r.custoEnergia, 0.498 + 2 * 0.083, 'energia')
  perto(r.partes.reduce((a, p) => a + p.custoTotal, 0), r.custoTotal, 'soma dos custos')
  perto(r.custoTotal, 5 + 4 + 0.498 + 0.166 + 2 + 8, 'total')
  perto(r.partes.reduce((a, p) => a + p.precoTotal, 0), r.precoVenda, 'soma dos preços')
})

test('objeto com partes e depreciação: cada parte paga pelo seu tempo; a soma continua fechando', () => {
  const r = calcularResultado(objeto({ depreciacaoHora: '2' }), 100)
  perto(r.custoDepreciacao, 2 * (3 + 2 * 0.5), 'depreciação (Base 3 h + Tampa 2 x 30 min)')
  perto(r.partes.reduce((a, p) => a + p.custoTotal, 0), r.custoTotal, 'soma das partes = total')
  perto(r.custoTotal, 5 + 4 + 0.498 + 0.166 + 2 + 8 + 8, 'total com depreciação')
})

test('preço manual e margens', () => {
  const m = calcularResultado(base(), 100, '10')
  const custo = m.custoTotal
  perto(m.lucro, 10 - custo, 'lucro')
  perto(m.margemSobreCusto, ((10 - custo) / custo) * 100, 'markup')
  perto(m.margemSobreVenda, ((10 - custo) / 10) * 100, 'margem s/ venda')
  assert.equal(m.precoPersonalizado, true)
  assert.equal(calcularResultado(base(), 100, '').precoPersonalizado, false)
  assert.equal(calcularResultado(base(), 100, '1.234,56').precoVenda, 1234.56)
  assert.ok(calcularResultado(base(), 0, '1').margemSobreCusto < 0, 'prejuízo vira margem negativa')
})

test('casos de borda não geram NaN', () => {
  const zero = calcularResultado(base({ filamentos: [{ id: 'a', precoRolo: '', pesoRolo: '1000', filamentoUsado: '' }], horas: '', minutos: '' }), 100)
  assert.equal(zero.margemSobreCusto, null)
  assert.ok(!Number.isNaN(zero.precoVenda))
  const so = calcularResultado(base({ modoPartes: true, custoFixo: '10', partes: [f({ nome: 'A' }), f({ id: '2', quantidade: '3' })] }), 100)
  assert.ok(so.partes.every((p) => Number.isFinite(p.custoUnitario) && Number.isFinite(p.precoUnitario)))
  perto(so.custoTotal, 10, 'só custo fixo')
})
