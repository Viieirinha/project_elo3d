import { api } from './api.js'

export async function getEstoqueMinimo() {
  const { valor } = await api('/config/estoque-minimo')
  return valor
}

export async function setEstoqueMinimo(valor) {
  await api('/config/estoque-minimo', { method: 'PUT', body: { valor } })
}
