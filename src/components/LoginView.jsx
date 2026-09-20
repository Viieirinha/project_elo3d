import { useState } from 'react'
import { LogIn, UserPlus, Loader2 } from 'lucide-react'
import { useAuth } from '../utils/AuthContext.jsx'
import logoMark from '../assets/logo-mark.png'

const MENSAGENS_ERRO = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
}

function traduzirErro(erro) {
  return MENSAGENS_ERRO[erro?.code] || 'Não foi possível concluir. Tente novamente.'
}

export default function LoginView() {
  const { entrar, cadastrar } = useAuth()
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const isCadastro = modo === 'cadastrar'

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (isCadastro) {
        await cadastrar(email.trim(), senha, nome.trim())
      } else {
        await entrar(email.trim(), senha)
      }
    } catch (err) {
      setErro(traduzirErro(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-elo-bg px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src={logoMark} alt="ELO 3D" className="h-14 w-14 rounded-xl object-cover shadow-glow" />
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">
              ELO <span className="gradient-text">3D</span>
            </h1>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Inovação e Design Tridimensional
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-elo-border bg-elo-card/80 p-6 shadow-lg shadow-black/20">
          <div className="mb-5 flex rounded-full border border-elo-border bg-surface-subtle p-1">
            <button
              type="button"
              onClick={() => setModo('entrar')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                modo === 'entrar' ? 'bg-elo-gradient text-white shadow-md' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setModo('cadastrar')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                isCadastro ? 'bg-elo-gradient text-white shadow-md' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isCadastro && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-secondary">Nome</span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                autoComplete="email"
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-secondary">Senha</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isCadastro ? 'new-password' : 'current-password'}
                className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
            </label>

            {erro && <p className="text-xs font-medium text-elo-pink">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-elo-gradient px-4 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isCadastro ? (
                <UserPlus size={16} />
              ) : (
                <LogIn size={16} />
              )}
              {isCadastro ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
