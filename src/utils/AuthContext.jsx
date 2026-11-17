import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setCarregando(false)
    } else {
      api('/auth/me')
        .then(({ user }) => setUser(user))
        .catch((err) => {
          // Só descarta a sessão se o servidor a recusou; falha de rede mantém o token.
          if (err.status === 401) clearToken()
        })
        .finally(() => setCarregando(false))
    }

    const aoExpirar = () => setUser(null)
    window.addEventListener('elo3d:unauthorized', aoExpirar)
    return () => window.removeEventListener('elo3d:unauthorized', aoExpirar)
  }, [])

  async function iniciarSessao(caminho, corpo) {
    const { token, user } = await api(caminho, { method: 'POST', body: corpo })
    setToken(token)
    setUser(user)
  }

  const cadastrar = (email, senha, nome, codigoConvite) =>
    iniciarSessao('/auth/register', { email, senha, nome, codigoConvite })

  const entrar = (email, senha) => iniciarSessao('/auth/login', { email, senha })

  async function sair() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, carregando, cadastrar, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
