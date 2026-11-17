import { useState } from 'react'
import {
  Calculator,
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  History,
  Settings,
  Sun,
  Moon,
  LogOut,
  Ellipsis,
} from 'lucide-react'
import logoMark from '../assets/logo-mark.webp'
import { getTheme, applyTheme } from '../utils/theme.js'
import { useAuth } from '../utils/AuthContext.jsx'
import Modal from './ui/Modal.jsx'
import Button from './ui/Button.jsx'

export const TELAS = [
  { id: 'calculadora', rotulo: 'Calculadora', icone: Calculator },
  { id: 'dashboard', rotulo: 'Dashboard', icone: LayoutDashboard },
  { id: 'estoque', rotulo: 'Estoque', icone: Package },
  { id: 'vendas', rotulo: 'Vendas', icone: ShoppingCart },
  { id: 'pedidos', rotulo: 'Encomendas', icone: ClipboardList },
  { id: 'historico', rotulo: 'Histórico', icone: History },
  { id: 'configuracoes', rotulo: 'Configurações', icone: Settings },
]

const NA_BARRA = ['calculadora', 'estoque', 'vendas', 'pedidos']

function Marca({ compacta = false }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logoMark} alt="" width="40" height="40" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-elo-border" />
      <div className="leading-tight">
        <p className="font-display text-lg font-bold tracking-tight text-ink-primary">
          ELO <span className="gradient-text">3D</span>
        </p>
        {!compacta && <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Design Tridimensional</p>}
      </div>
    </div>
  )
}

function useTema() {
  const [tema, setTema] = useState(getTheme)
  function alternar() {
    const proximo = tema === 'light' ? 'dark' : 'light'
    applyTheme(proximo)
    setTema(proximo)
  }
  return [tema, alternar]
}

function Inicial({ user }) {
  const base = (user?.displayName || user?.email || '?').trim()
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elo-brand text-sm font-bold uppercase text-white"
    >
      {base[0]}
    </span>
  )
}

export default function AppShell({ view, onViewChange, children }) {
  const { user, sair } = useAuth()
  const [tema, alternarTema] = useTema()
  const [maisAberto, setMaisAberto] = useState(false)
  const telaAtual = TELAS.find((t) => t.id === view)
  const noMais = !NA_BARRA.includes(view)

  const TemaIcone = tema === 'light' ? Moon : Sun
  const rotuloTema = tema === 'light' ? 'Modo escuro' : 'Modo claro'

  function ir(id) {
    onViewChange(id)
    setMaisAberto(false)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen bg-elo-bg">
      {/* brilho suave de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{ background: 'radial-gradient(900px 420px at 75% -8%, var(--glow), transparent 70%)' }}
      />

      {/* ---------- Menu lateral (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] flex-col border-r border-elo-border bg-elo-panel lg:flex">
        <div className="px-5 pb-4 pt-6">
          <Marca />
        </div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {TELAS.map((t) => {
              const ativo = view === t.id
              const Icone = t.icone
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => ir(t.id)}
                    aria-current={ativo ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      ativo ? 'bg-elo-blue/10 text-ink-primary' : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary'
                    }`}
                  >
                    {ativo && <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-elo-brand" aria-hidden="true" />}
                    <Icone size={18} className={ativo ? 'text-elo-blue' : 'text-ink-muted group-hover:text-ink-secondary'} />
                    {t.rotulo}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-elo-border p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Inicial user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-primary">{user?.displayName || 'Minha conta'}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Button tamanho="sm" icone={TemaIcone} onClick={alternarTema}>
              {tema === 'light' ? 'Escuro' : 'Claro'}
            </Button>
            <Button tamanho="sm" icone={LogOut} onClick={sair}>
              Sair
            </Button>
          </div>
          <p className="mt-3 px-1 text-center text-[10px] leading-snug text-ink-muted">Inovação e Design Tridimensional</p>
        </div>
      </aside>

      {/* ---------- Barra superior (celular/tablet) ---------- */}
      <header className="sticky top-0 z-30 border-b border-elo-border bg-elo-panel/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Marca compacta />
          <p className="truncate font-display text-sm font-semibold text-ink-secondary">{telaAtual?.rotulo}</p>
        </div>
      </header>

      <main className="relative z-10 lg:pl-[256px]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</div>
      </main>

      {/* ---------- Barra inferior (celular/tablet) ---------- */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-elo-border bg-elo-panel/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NA_BARRA.map((id) => {
            const t = TELAS.find((x) => x.id === id)
            const ativo = view === id
            const Icone = t.icone
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => ir(id)}
                  aria-current={ativo ? 'page' : undefined}
                  className={`flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors ${
                    ativo ? 'text-elo-blue' : 'text-ink-muted'
                  }`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${ativo ? 'bg-elo-blue/12' : ''}`}>
                    <Icone size={19} />
                  </span>
                  {t.rotulo}
                </button>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMaisAberto(true)}
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors ${
                noMais ? 'text-elo-blue' : 'text-ink-muted'
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${noMais ? 'bg-elo-blue/12' : ''}`}>
                <Ellipsis size={19} />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={maisAberto} onClose={() => setMaisAberto(false)} titulo="Mais opções" tamanho="sm">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
          <Inicial user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-primary">{user?.displayName || 'Minha conta'}</p>
            <p className="truncate text-xs text-ink-muted">{user?.email}</p>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {TELAS.filter((t) => !NA_BARRA.includes(t.id)).map((t) => {
            const Icone = t.icone
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => ir(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    view === t.id ? 'bg-elo-blue/10 text-ink-primary' : 'text-ink-secondary hover:bg-surface-hover'
                  }`}
                >
                  <Icone size={18} className={view === t.id ? 'text-elo-blue' : 'text-ink-muted'} />
                  {t.rotulo}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button icone={TemaIcone} onClick={alternarTema}>
            {rotuloTema}
          </Button>
          <Button icone={LogOut} onClick={sair}>
            Sair
          </Button>
        </div>
      </Modal>
    </div>
  )
}
