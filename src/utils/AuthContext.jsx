import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api, getToken, setToken, clearToken } from './api.js'
import { deveRenovar, expirou, intervaloDeVerificacao, lerSessao } from './sessao.js'

const AuthContext = createContext(null)
const CHAVE_TOKEN = 'elo3d_token'
const EVENTOS_DE_ATIVIDADE = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [avisoSaida, setAvisoSaida] = useState(null) // 'expirada' | 'senha-alterada' | null: mostrado na tela de login

  const encerrar = useCallback((motivo) => {
    clearToken()
    setUser(null)
    setAvisoSaida(motivo ?? null)
  }, [])

  // ---- ao abrir o sistema: confere a sessão guardada
  useEffect(() => {
    const token = getToken()
    const sessao = token ? lerSessao(token) : null
    if (!token) {
      setCarregando(false)
    } else if (!sessao || expirou(Date.now(), sessao.exp)) {
      encerrar('expirada') // ficou parado (ou o navegador fechado) além do prazo
      setCarregando(false)
    } else {
      api('/auth/me')
        .then(({ user }) => setUser(user))
        .catch((err) => {
          // Só descarta a sessão se o servidor a recusou (o api.js já avisa o motivo); falha de rede mantém o token.
          if (err.status === 401) clearToken()
        })
        .finally(() => setCarregando(false))
    }

    const aoRecusar = (e) => encerrar(e.detail?.motivo ?? 'expirada')
    window.addEventListener('elo3d:unauthorized', aoRecusar)
    return () => window.removeEventListener('elo3d:unauthorized', aoRecusar)
  }, [encerrar])

  // ---- com o usuário logado: renova enquanto ele usa o sistema e encerra quando o prazo acaba
  const renovando = useRef(false)
  useEffect(() => {
    if (!user) return undefined
    let ultimaAtividade = Date.now()
    let ultimaRenovacao = Date.now()
    const marcarAtividade = () => {
      ultimaAtividade = Date.now()
    }

    async function verificar() {
      const sessao = lerSessao(getToken())
      if (!sessao) return encerrar('expirada')
      const agora = Date.now()
      if (expirou(agora, sessao.exp)) return encerrar('expirada')
      if (!renovando.current && deveRenovar({ agora, exp: sessao.exp, idleMs: sessao.idleMs, ultimaAtividade, ultimaRenovacao })) {
        renovando.current = true
        ultimaRenovacao = agora
        try {
          const { token } = await api('/auth/renovar', { method: 'POST' })
          setToken(token)
        } catch {
          /* 401: o api.js já encerra a sessão; falha de rede: tenta de novo na próxima verificação */
        } finally {
          renovando.current = false
        }
      }
    }

    // O navegador atrasa timers em abas escondidas e notebooks que dormem: confere também ao voltar.
    const aoVoltar = () => document.visibilityState === 'visible' && verificar()
    // Saiu em outra aba: sai aqui também. Renovação em outra aba: o token novo já está no localStorage.
    const aoMudarArmazenamento = (e) => {
      if (e.key === CHAVE_TOKEN && e.newValue === null) setUser(null)
    }

    for (const evento of EVENTOS_DE_ATIVIDADE) window.addEventListener(evento, marcarAtividade, { passive: true })
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    window.addEventListener('storage', aoMudarArmazenamento)
    const sessaoInicial = lerSessao(getToken())
    const timer = setInterval(verificar, intervaloDeVerificacao(sessaoInicial?.idleMs ?? 3_600_000))
    return () => {
      clearInterval(timer)
      for (const evento of EVENTOS_DE_ATIVIDADE) window.removeEventListener(evento, marcarAtividade)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
      window.removeEventListener('storage', aoMudarArmazenamento)
    }
  }, [user, encerrar])

  async function iniciarSessao(caminho, corpo) {
    const { token, user } = await api(caminho, { method: 'POST', body: corpo })
    setToken(token)
    setAvisoSaida(null)
    setUser(user)
  }

  const cadastrar = (email, senha, nome, codigoConvite) =>
    iniciarSessao('/auth/register', { email, senha, nome, codigoConvite })

  const entrar = (email, senha) => iniciarSessao('/auth/login', { email, senha })

  // Define uma nova senha (com o código de convite) e já entra no sistema.
  const redefinirSenha = (email, codigoConvite, novaSenha) =>
    iniciarSessao('/auth/reset-password', { email, codigoConvite, novaSenha })

  async function sair() {
    encerrar(null) // saída voluntária: sem aviso na tela de login
  }

  return (
    <AuthContext.Provider value={{ user, carregando, avisoSaida, cadastrar, entrar, redefinirSenha, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
