const TOKEN_KEY = 'elo3d_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

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
    // Token vencido/revogado numa chamada autenticada: derruba a sessão.
    if (res.status === 401 && token && data.code === 'auth/unauthorized') {
      clearToken()
      window.dispatchEvent(new Event('elo3d:unauthorized'))
    }
    throw Object.assign(new Error(data.message || 'Erro no servidor.'), { code: data.code, status: res.status })
  }
  return data
}
