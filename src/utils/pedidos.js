import { api } from './api.js'

export const STATUS_PEDIDO = ['pedido', 'producao', 'pronto', 'entregue', 'cancelado']

export const getPedidos = () => api('/pedidos')
export const registrarPedido = (dados) => api('/pedidos', { method: 'POST', body: dados })
export const atualizarStatusPedido = (id, status) =>
  api(`/pedidos/${id}/status`, { method: 'PATCH', body: { status } })
export const removerPedido = (id) => api(`/pedidos/${id}`, { method: 'DELETE' })
