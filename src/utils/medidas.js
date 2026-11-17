import { parseLocaleNumber } from './format.js'

export const medidasVazias = () => ({ altura: '', largura: '', profundidade: '', unidade: 'cm' })

const CAMPOS = ['altura', 'largura', 'profundidade']
const paraTexto = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','))

// Produto vindo da API -> estado do formulário (textos).
export function medidasDoProduto(produto) {
  return {
    altura: paraTexto(produto?.altura),
    largura: paraTexto(produto?.largura),
    profundidade: paraTexto(produto?.profundidade),
    unidade: produto?.unidadeMedida === 'm' ? 'm' : 'cm',
  }
}

// Estado do formulário -> corpo da API (campo vazio vira null, o que limpa o valor no servidor).
export function medidasParaApi(medidas) {
  const corpo = { unidadeMedida: medidas.unidade }
  for (const campo of CAMPOS) {
    const texto = String(medidas[campo] ?? '').trim()
    corpo[campo] = texto === '' ? null : parseLocaleNumber(texto)
  }
  return corpo
}

export const medidasValidas = (medidas) =>
  CAMPOS.every((campo) => {
    const texto = String(medidas[campo] ?? '').trim()
    return texto === '' || parseLocaleNumber(texto) >= 0
  })

const formatar = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 })

// "A 30,5 × L 20 × P 15 cm"; só as dimensões informadas. Vazio se nenhuma foi informada.
export function formatarMedidas(produto) {
  const partes = [
    ['A', produto?.altura],
    ['L', produto?.largura],
    ['P', produto?.profundidade],
  ]
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([letra, v]) => `${letra} ${formatar(v)}`)
  return partes.length ? `${partes.join(' × ')} ${produto.unidadeMedida === 'm' ? 'm' : 'cm'}` : ''
}
