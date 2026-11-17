import { api } from './api.js'

export const getProdutos = () => api('/produtos')
export const getMovimentacoes = () => api('/movimentacoes')

// Retorna a lista atualizada de produtos.
export const registrarProduto = (dados) => api('/produtos', { method: 'POST', body: dados })
export const atualizarProduto = (id, dados) => api(`/produtos/${id}`, { method: 'PUT', body: dados })
export const removerProduto = (id) => api(`/produtos/${id}`, { method: 'DELETE' })

// Retorna { produtos, movimentacoes }.
export const registrarMovimentacao = (dados) => api('/movimentacoes', { method: 'POST', body: dados })
export const removerMovimentacao = (id) => api(`/movimentacoes/${id}`, { method: 'DELETE' })
