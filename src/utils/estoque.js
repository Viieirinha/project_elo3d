import { api } from './api.js'

// `{ comFoto: false }` evita baixar as imagens (base64) quando a tela só precisa de nome, preço e estoque.
export const getProdutos = ({ comFoto = true } = {}) => api(comFoto ? '/produtos' : '/produtos?fotos=0')
export const getMovimentacoes = () => api('/movimentacoes')

// Retorna a lista atualizada de produtos.
export const registrarProduto = (dados) => api('/produtos', { method: 'POST', body: dados })
export const atualizarProduto = (id, dados) => api(`/produtos/${id}`, { method: 'PUT', body: dados })
export const removerProduto = (id) => api(`/produtos/${id}`, { method: 'DELETE' })

// Retorna { produtos, movimentacoes }.
export const registrarMovimentacao = (dados) => api('/movimentacoes', { method: 'POST', body: dados })
export const removerMovimentacao = (id) => api(`/movimentacoes/${id}`, { method: 'DELETE' })
