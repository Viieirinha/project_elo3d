import { parseLocaleNumber } from './format.js'

const soma = (lista, fn) => lista.reduce((acc, item) => acc + fn(item), 0)

/**
 * Calcula custos e preços a partir do formulário da calculadora.
 *
 * - Peça única: o formulário tem os filamentos (com as gramas usadas) e o tempo de impressão.
 * - Objeto com partes: cada parte tem suas gramas, filamento e tempo. Custos fixos e mão de obra
 *   são do objeto inteiro e são rateados entre as partes proporcionalmente ao custo de cada uma,
 *   de modo que a soma das partes é sempre igual ao total do objeto.
 *
 * `precoManual` (texto ou null) substitui o preço sugerido; as margens são sempre calculadas
 * a partir do preço final.
 */
export function calcularResultado(form, margem, precoManual = null) {
  const consumoW = parseLocaleNumber(form.consumoW)
  const valorKwh = parseLocaleNumber(form.valorKwh)
  const custoFixo = parseLocaleNumber(form.custoFixo)
  const maoDeObra = parseLocaleNumber(form.maoDeObra)
  const custoEnergiaDe = (horas) => (horas > 0 ? (consumoW / 1000) * horas * valorKwh : 0)
  // Depreciação da máquina: R$ por hora de impressão (desgaste/amortização da impressora). Vazio = 0.
  const depreciacaoHora = parseLocaleNumber(form.depreciacaoHora)
  const custoDepreciacaoDe = (horas) => (horas > 0 ? depreciacaoHora * horas : 0)
  const modoPartes = Boolean(form.modoPartes)

  const filamentos = form.filamentos.map((f) => ({
    id: f.id,
    precoRolo: parseLocaleNumber(f.precoRolo),
    pesoRolo: parseLocaleNumber(f.pesoRolo),
    pesoRoloTexto: f.pesoRolo,
    usado: parseLocaleNumber(f.filamentoUsado),
  }))
  const pesoRoloInvalido = filamentos.some((f) => f.pesoRoloTexto.trim() !== '' && f.pesoRolo <= 0)
  const custoDoGrama = (f) => (f && f.pesoRolo > 0 ? f.precoRolo / f.pesoRolo : 0)

  let quantidadePecas = 1
  let custoFilamento
  let custoEnergia
  let custoDepreciacao
  let custoTotal
  let gramasTotais
  let horasTotais
  let tempoInvalido
  let partes = []

  if (!modoPartes) {
    quantidadePecas = Math.max(1, parseLocaleNumber(form.quantidadePecas) || 1)
    const horas = parseLocaleNumber(form.horas)
    const minutos = parseLocaleNumber(form.minutos)
    horasTotais = (horas + minutos / 60) / quantidadePecas
    tempoInvalido = (form.horas.trim() !== '' || form.minutos.trim() !== '') && horasTotais <= 0

    custoFilamento = soma(filamentos, (f) => custoDoGrama(f) * (f.usado / quantidadePecas))
    gramasTotais = soma(filamentos, (f) => f.usado / quantidadePecas)
    custoEnergia = custoEnergiaDe(horasTotais)
    custoDepreciacao = custoDepreciacaoDe(horasTotais)
    custoTotal = custoFilamento + custoEnergia + custoDepreciacao + custoFixo + maoDeObra
  } else {
    const base = form.partes.map((p, i) => {
      const filamento = filamentos.find((f) => f.id === p.filamentoId) ?? filamentos[0]
      const quantidade = Math.max(1, Math.round(parseLocaleNumber(p.quantidade) || 1))
      const gramas = parseLocaleNumber(p.gramas)
      const horas = parseLocaleNumber(p.horas) + parseLocaleNumber(p.minutos) / 60
      const filamentoUnit = custoDoGrama(filamento) * gramas
      const energiaUnit = custoEnergiaDe(horas)
      const depreciacaoUnit = custoDepreciacaoDe(horas)
      return {
        id: p.id,
        nome: p.nome.trim() || `Parte ${i + 1}`,
        quantidade,
        gramas,
        horas,
        filamentoUnit,
        energiaUnit,
        depreciacaoUnit,
        semTempoValido: (p.horas.trim() !== '' || p.minutos.trim() !== '') && horas <= 0,
        subtotal: (filamentoUnit + energiaUnit + depreciacaoUnit) * quantidade,
      }
    })

    tempoInvalido = base.some((p) => p.semTempoValido)
    custoFilamento = soma(base, (p) => p.filamentoUnit * p.quantidade)
    custoEnergia = soma(base, (p) => p.energiaUnit * p.quantidade)
    custoDepreciacao = soma(base, (p) => p.depreciacaoUnit * p.quantidade)
    gramasTotais = soma(base, (p) => p.gramas * p.quantidade)
    horasTotais = soma(base, (p) => p.horas * p.quantidade)

    // Rateio dos custos do objeto (fixo + mão de obra) entre as partes.
    const adicionais = custoFixo + maoDeObra
    const somaSubtotais = soma(base, (p) => p.subtotal)
    const somaQuantidades = soma(base, (p) => p.quantidade)
    partes = base.map((p) => {
      const fracao =
        somaSubtotais > 0 ? p.subtotal / somaSubtotais : somaQuantidades > 0 ? p.quantidade / somaQuantidades : 0
      const custoTotalParte = p.subtotal + adicionais * fracao
      return {
        id: p.id,
        nome: p.nome,
        quantidade: p.quantidade,
        gramas: p.gramas,
        custoUnitario: custoTotalParte / p.quantidade,
        custoTotal: custoTotalParte,
      }
    })
    custoTotal = base.length > 0 ? soma(partes, (p) => p.custoTotal) : adicionais
  }

  const precoSugerido = custoTotal * (1 + margem / 100)
  const textoManual = precoManual == null ? '' : String(precoManual).trim()
  const precoPersonalizado = textoManual !== ''
  const precoVenda = precoPersonalizado ? parseLocaleNumber(textoManual) : precoSugerido

  const lucro = precoVenda - custoTotal
  const margemSobreCusto = custoTotal > 0 ? (lucro / custoTotal) * 100 : null
  const margemSobreVenda = precoVenda > 0 ? (lucro / precoVenda) * 100 : null

  // Cada parte recebe a mesma margem do objeto, então a soma dos preços das partes é o preço do objeto.
  const somaQuantidadesPartes = soma(partes, (p) => p.quantidade)
  partes = partes.map((p) => {
    const precoTotal =
      custoTotal > 0 ? (p.custoTotal / custoTotal) * precoVenda : (p.quantidade / somaQuantidadesPartes) * precoVenda
    return { ...p, precoTotal, precoUnitario: precoTotal / p.quantidade }
  })

  return {
    modoPartes,
    partes,
    quantidadePecas,
    custoFilamento,
    custoEnergia,
    custoDepreciacao,
    custoFixo,
    maoDeObra,
    custoTotal,
    precoSugerido,
    precoVenda,
    precoPersonalizado,
    lucro,
    margemSobreCusto,
    margemSobreVenda,
    custoPorGrama: gramasTotais > 0 ? custoTotal / gramasTotais : 0,
    custoPorHora: horasTotais > 0 ? custoTotal / horasTotais : 0,
    hasError: pesoRoloInvalido || tempoInvalido,
  }
}
