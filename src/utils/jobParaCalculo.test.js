import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarJobNoForm, duracaoParaHorasMinutos, formatarDuracao } from './jobParaCalculo.js'
import { calcularResultado } from './calculo.js'

const formBase = (extra = {}) => ({
  modoPartes: true, partes: [], quantidadePecas: '4', consumoW: '200', horas: '', minutos: '', valorKwh: '0,83', custoFixo: '', maoDeObra: '', depreciacaoHora: '',
  filamentos: [{ id: 'a', nome: '', precoRolo: '120', pesoRolo: '1000', filamentoUsado: '99' }], ...extra,
})

test('duração: converte segundos em horas e minutos (arredondando para minutos)', () => {
  assert.deepEqual(duracaoParaHorasMinutos(5400), { horas: 1, minutos: 30 })
  assert.deepEqual(duracaoParaHorasMinutos(3600), { horas: 1, minutos: 0 })
  assert.deepEqual(duracaoParaHorasMinutos(89), { horas: 0, minutos: 1 })
  assert.deepEqual(duracaoParaHorasMinutos(30), { horas: 0, minutos: 1 }) // job curto nunca vira 0 min
  assert.deepEqual(duracaoParaHorasMinutos(0), { horas: 0, minutos: 0 })
  assert.deepEqual(duracaoParaHorasMinutos(3599), { horas: 1, minutos: 0 }) // 59,98 min -> 60 -> 1 h
  assert.deepEqual(duracaoParaHorasMinutos(-5), { horas: 0, minutos: 0 })
  assert.deepEqual(duracaoParaHorasMinutos(undefined), { horas: 0, minutos: 0 })
})

test('formatarDuracao', () => {
  assert.equal(formatarDuracao(35), '35 s')
  assert.equal(formatarDuracao(2520), '42 min')
  assert.equal(formatarDuracao(5280), '1 h 28 min')
  assert.equal(formatarDuracao(7200), '2 h')
})

test('preenche o TEMPO REAL e volta para "Peça única" com 1 peça', () => {
  const { form } = aplicarJobNoForm(formBase(), { duracaoSegundos: 5400, materiais: null, gramasEstimadas: null })
  assert.equal(form.horas, '1')
  assert.equal(form.minutos, '30')
  assert.equal(form.modoPartes, false)
  assert.equal(form.quantidadePecas, '1')
})

test('sem dados de filamento: mantém as gramas digitadas e avisa que é manual', () => {
  const { form, avisos } = aplicarJobNoForm(formBase(), { duracaoSegundos: 600, materiais: null, gramasEstimadas: null })
  assert.equal(form.filamentos[0].filamentoUsado, '99') // não apaga o que o usuário digitou
  assert.ok(avisos.some((a) => a.includes('manualmente')))
})

test('só o total de gramas: vai para o primeiro filamento', () => {
  const { form } = aplicarJobNoForm(formBase(), { duracaoSegundos: 600, materiais: null, gramasEstimadas: 31.74 })
  assert.equal(form.filamentos[0].filamentoUsado, '31,7')
})

test('várias ferramentas: cria uma linha de filamento por ferramenta, preservando preço/peso existentes', () => {
  const job = { duracaoSegundos: 600, gramasEstimadas: 31.7, materiais: [{ ferramenta: 0, material: 'PLA', gramas: 20.5 }, { ferramenta: 1, material: 'PETG', gramas: 11.2 }] }
  const { form, avisos } = aplicarJobNoForm(formBase(), job)
  assert.equal(form.filamentos.length, 2)
  assert.equal(form.filamentos[0].precoRolo, '120') // o existente mantém preço e peso
  assert.equal(form.filamentos[0].filamentoUsado, '20,5')
  assert.equal(form.filamentos[1].filamentoUsado, '11,2')
  assert.equal(form.filamentos[1].precoRolo, '') // o novo precisa do preço
  assert.equal(form.filamentos[1].nome, 'PETG')
  assert.ok(avisos.some((a) => a.includes('estimativas')))
})

test('menos ferramentas que linhas: as sobras são zeradas (não somam gramas de outra impressão)', () => {
  const base = formBase({ filamentos: [{ id: 'a', nome: '', precoRolo: '120', pesoRolo: '1000', filamentoUsado: '5' }, { id: 'b', nome: '', precoRolo: '100', pesoRolo: '1000', filamentoUsado: '7' }] })
  const { form } = aplicarJobNoForm(base, { duracaoSegundos: 60, materiais: [{ gramas: 9 }] })
  assert.equal(form.filamentos[0].filamentoUsado, '9')
  assert.equal(form.filamentos[1].filamentoUsado, '')
})

test('não altera o formulário original (função pura)', () => {
  const base = formBase()
  const copia = JSON.parse(JSON.stringify(base))
  aplicarJobNoForm(base, { duracaoSegundos: 600, materiais: [{ gramas: 9 }, { gramas: 3 }] })
  assert.deepEqual(base, copia)
})

test('início estimado gera um aviso sobre a duração aproximada', () => {
  const { avisos } = aplicarJobNoForm(formBase(), { duracaoSegundos: 600, inicioEstimado: true })
  assert.ok(avisos.some((a) => a.includes('estimado')))
})

test('INTEGRAÇÃO COM O CUSTO: o tempo real do job entra em energia e depreciação', () => {
  const base = formBase({ depreciacaoHora: '2', filamentos: [{ id: 'a', nome: '', precoRolo: '100', pesoRolo: '1000', filamentoUsado: '' }] })
  const { form } = aplicarJobNoForm(base, { duracaoSegundos: 7200, gramasEstimadas: 50, materiais: null }) // 2 h, 50 g
  const r = calcularResultado(form, 100)
  assert.ok(Math.abs(r.custoEnergia - 0.2 * 2 * 0.83) < 1e-9, `energia ${r.custoEnergia}`) // 200 W x 2 h x 0,83
  assert.ok(Math.abs(r.custoDepreciacao - 4) < 1e-9, `depreciação ${r.custoDepreciacao}`) // R$ 2/h x 2 h
  assert.ok(Math.abs(r.custoFilamento - 5) < 1e-9, `filamento ${r.custoFilamento}`) // 50 g x R$ 0,10/g
  assert.ok(Math.abs(r.custoTotal - (5 + 0.332 + 4)) < 1e-9)
})
