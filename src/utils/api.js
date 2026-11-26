const TOKEN_KEY = 'elo3d_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Códigos de "a sessão deixou de valer" (em uma chamada feita com login). Cada um vira um aviso na tela de login.
const MOTIVOS_DE_SAIDA = { 'auth/sessao-expirada': 'expirada', 'auth/senha-alterada': 'senha-alterada', 'auth/unauthorized': 'expirada' }

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('Sem conexão com o servidor.'), { code: 'network' })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Sessão vencida/revogada numa chamada autenticada: derruba a sessão e diz o motivo.
    if (res.status === 401 && token && MOTIVOS_DE_SAIDA[data.code]) {
      clearToken()
      window.dispatchEvent(new CustomEvent('elo3d:unauthorized', { detail: { motivo: MOTIVOS_DE_SAIDA[data.code] } }))
    }
    throw Object.assign(new Error(data.message || 'Erro no servidor.'), { code: data.code, status: res.status })
  }
  return data
}
