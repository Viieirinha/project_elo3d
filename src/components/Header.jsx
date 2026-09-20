import { useState } from 'react'
import { Calculator, Package, ShoppingCart, Settings, Sun, Moon, LogOut, ClipboardList, LayoutDashboard } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { getTheme, applyTheme } from '../utils/theme.js'
import { useAuth } from '../utils/AuthContext.jsx'

const TABS = [
  { id: 'calculadora', label: 'Calculadora', icon: Calculator },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
  { id: 'pedidos', label: 'Encomendas', icon: ClipboardList },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
]

export default function Header({ view, onViewChange }) {
  const [theme, setTheme] = useState(getTheme)
  const { user, sair } = useAuth()

  function toggleTheme() {
    const proximo = theme === 'light' ? 'dark' : 'light'
    applyTheme(proximo)
    setTheme(proximo)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-elo-border/80 bg-elo-panel/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
        <img
          src={logoMark}
          alt="ELO 3D"
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover shadow-glow"
        />
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight text-ink-primary sm:text-xl">
            ELO <span className="gradient-text">3D</span>
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted sm:text-xs">
            Inovação e Design Tridimensional
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto rounded-full border border-elo-border bg-surface-subtle p-1 sm:flex-initial sm:gap-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = view === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-150 sm:px-3 ${
                    isActive
                      ? 'bg-elo-gradient text-white shadow-md'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-elo-border bg-surface-subtle text-ink-secondary transition-colors hover:text-ink-primary"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {user && (
            <button
              type="button"
              onClick={sair}
              title={`Sair (${user.email})`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-elo-border bg-surface-subtle text-ink-secondary transition-colors hover:text-red-400"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
