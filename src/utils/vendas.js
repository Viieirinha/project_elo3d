import { api } from './api.js'

export const getVendas = () => api('/vendas')
export const registrarVenda = (dados) => api('/vendas', { method: 'POST', body: dados })
export const removerVenda = (id) => api(`/vendas/${id}`, { method: 'DELETE' })
