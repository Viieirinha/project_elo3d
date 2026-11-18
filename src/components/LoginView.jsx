import { useState } from 'react'
import { LogIn, UserPlus, KeyRound, ArrowLeft, Eye, EyeOff, Calculator, Package, ClipboardList } from 'lucide-react'
import { useAuth } from '../utils/AuthContext.jsx'
import logoMark from '../assets/logo-mark.webp'
import Button from './ui/Button.jsx'
import Segmented from './ui/Segmented.jsx'
import { Campo, Input } from './ui/Field.jsx'

const MENSAGENS_ERRO = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/invalid-invite': 'Código de convite inválido.',
  'auth/signup-disabled': 'O cadastro está desativado.',
  'auth/reset-disabled': 'A redefinição de senha está desativada. Fale com o administrador.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  network: 'Sem conexão com o servidor.',
}

const traduzirErro = (erro) => MENSAGENS_ERRO[erro?.code] || 'Não foi possível concluir. Tente novamente.'

const MODOS = [
  { valor: 'entrar', rotulo: 'Entrar' },
  { valor: 'cadastrar', rotulo: 'Criar conta' },
]

const DESTAQUES = [
  { icone: Calculator, texto: 'Calcule o custo e o preço de cada peça em segundos' },
  { icone: Package, texto: 'Controle estoque, vendas e lucro em um só lugar' },
  { icone: ClipboardList, texto: 'Acompanhe encomendas até a entrega' },
]

const TEXTOS = {
  entrar: { titulo: 'Bem-vindo de volta', subtitulo: 'Entre para acessar o seu painel.' },
  cadastrar: { titulo: 'Criar conta', subtitulo: 'Use o código de convite fornecido pelo administrador.' },
  recuperar: { titulo: 'Redefinir senha', subtitulo: 'Informe seu e-mail, o código de convite e escolha uma nova senha.' },
}

// Campo de senha com botão de mostrar/ocultar.
function CampoSenha({ rotulo = 'Senha', dica, value, onChange, novo = false, visivel, onAlternar }) {
  return (
    <Campo rotulo={rotulo} dica={dica}>
      <div className="field-wrap">
        <input
          type={visivel ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          required
          minLength={novo ? 8 : undefined}
          autoComplete={novo ? 'new-password' : 'current-password'}
          className="w-full min-w-0 bg-transparent py-2.5 pl-3.5 text-[15px] font-medium text-ink-primary outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={onAlternar}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          className="px-3.5 text-ink-muted transition-colors hover:text-ink-primary"
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </Campo>
  )
}

export default function LoginView() {
  const { entrar, cadastrar, redefinirSenha } = useAuth()
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const isCadastro = modo === 'cadastrar'
  const isRecuperar = modo === 'recuperar'
  const textos = TEXTOS[modo]

  function mudarModo(novo) {
    setModo(novo)
    setErro('')
    setSenha('')
    setVerSenha(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (isCadastro) await cadastrar(email.trim(), senha, nome.trim(), codigoConvite.trim())
      else if (isRecuperar) await redefinirSenha(email.trim(), codigoConvite.trim(), senha)
      else await entrar(email.trim(), senha)
    } catch (err) {
      setErro(traduzirErro(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-elo-bg lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-elo-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={logoMark} alt="" width="48" height="48" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/30" />
          <span className="font-display text-2xl font-bold tracking-tight">ELO 3D</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">
            Gestão simples para quem vive de impressão 3D.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {DESTAQUES.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icone size={17} />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Inovação e Design Tridimensional</p>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <img src={logoMark} alt="" width="56" height="56" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-elo-border" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-primary">
              ELO <span className="gradient-text">3D</span>
            </h1>
          </div>

          <h1 className={`mb-1 font-display text-2xl font-semibold tracking-tight text-ink-primary lg:text-3xl ${isRecuperar ? '' : 'hidden lg:block'}`}>
            {textos.titulo}
          </h1>
          <p className={`mb-6 text-sm text-ink-muted ${isRecuperar ? '' : 'hidden lg:block'}`}>{textos.subtitulo}</p>

          {isRecuperar ? (
            <button
              type="button"
              onClick={() => mudarModo('entrar')}
              className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              <ArrowLeft size={15} /> Voltar para o login
            </button>
          ) : (
            <Segmented
              rotulo="Entrar ou criar conta"
              opcoes={MODOS}
              valor={modo}
              onChange={mudarModo}
              className="mb-5 w-full [&>button]:flex-1 [&>button]:justify-center"
            />
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isCadastro && (
              <Campo rotulo="Nome">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required autoComplete="name" />
              </Campo>
            )}

            <Campo rotulo="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" required autoComplete="email" />
            </Campo>

            {(isCadastro || isRecuperar) && (
              <Campo rotulo="Código de convite" dica={isRecuperar ? 'Peça ao administrador do sistema.' : undefined}>
                <Input value={codigoConvite} onChange={(e) => setCodigoConvite(e.target.value)} placeholder="Fornecido pelo administrador" required autoComplete="off" />
              </Campo>
            )}

            <CampoSenha
              rotulo={isRecuperar ? 'Nova senha' : 'Senha'}
              dica={isCadastro || isRecuperar ? 'Mínimo de 8 caracteres.' : undefined}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              novo={isCadastro || isRecuperar}
              visivel={verSenha}
              onAlternar={() => setVerSenha((v) => !v)}
            />

            {modo === 'entrar' && (
              <button
                type="button"
                onClick={() => mudarModo('recuperar')}
                className="-mt-1.5 self-end text-sm font-medium text-elo-blue transition-colors hover:underline"
              >
                Esqueci a senha
              </button>
            )}

            {erro && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-400">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              variante="primary"
              tamanho="lg"
              bloco
              carregando={carregando}
              icone={isRecuperar ? KeyRound : isCadastro ? UserPlus : LogIn}
              className="mt-1"
            >
              {isRecuperar ? 'Redefinir senha' : isCadastro ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
