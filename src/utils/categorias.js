import { api } from './api.js'

export const getCategorias = () => api('/categorias')
export const adicionarCategoria = (nome) => api('/categorias', { method: 'POST', body: { nome } })
export const removerCategoria = (nome) => api(`/categorias/${encodeURIComponent(nome)}`, { method: 'DELETE' })
