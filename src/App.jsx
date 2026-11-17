import { lazy, Suspense, useMemo, useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import Header from './components/Header.jsx'
import FilamentoSection, { criarFilamentoVazio } from './components/FilamentoSection.jsx'
import EnergiaSection from './components/EnergiaSection.jsx'
import CustosAdicionaisSection from './components/CustosAdicionaisSection.jsx'
import PartesSection, { criarParteVazia } from './components/PartesSection.jsx'
import ResultadoSection from './components/ResultadoSection.jsx'
import { useAuth } from './utils/AuthContext.jsx'
import { calcularResultado } from './utils/calculo.js'

const LoginView = lazy(() => import('./components/LoginView.jsx'))
const EstoqueView = lazy(() => import('./components/EstoqueView.jsx'))
const VendasView = lazy(() => import('./components/VendasView.jsx'))
const HistoricoView = lazy(() => import('./components/HistoricoView.jsx'))
const ConfiguracoesView = lazy(() => import('./components/ConfiguracoesView.jsx'))
const PedidosView = lazy(() => import('./components/PedidosView.jsx'))
const DashboardView = lazy(() => import('./components/DashboardView.jsx'))

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-elo-bg">
      <Loader2 size={28} className="animate-spin text-elo-blue" />
    </div>
  )
}

function Rodape() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-elo-border/80 bg-elo-panel/90 py-3 text-center text-xs text-ink-muted backdrop-blur-md">
      ELO 3D — Inovação e Design Tridimensional
    </footer>
  )
}

function criarEstadoPadrao() {
  const filamento = criarFilamentoVazio()
  return {
    modoPartes: false,
    partes: [criarParteVazia(filamento.id)],
    quantidadePecas: '1',
    filamentos: [filamento],
    consumoW: '200',
    horas: '',
    minutos: '',
    valorKwh: '0,83',
    custoFixo: '',
    maoDeObra: '',
  }
}

const DEFAULT_MARGEM = 100

export default function App() {
  const { user, carregando } = useAuth()
  const [form, setForm] = useState(criarEstadoPadrao)
  const [margem, setMargem] = useState(DEFAULT_MARGEM)
  const [precoManual, setPrecoManual] = useState(null)
  const [view, setView] = useState('calculadora')

  const results = useMemo(() => calcularResultado(form, margem, precoManual), [form, margem, precoManual])

  // Mexer na margem (controle ou atalhos) descarta o preço digitado à mão.
  function handleMargemChange(valor) {
    setPrecoManual(null)
    setMargem(valor)
  }

  function handleReset() {
    setForm(criarEstadoPadrao())
    setMargem(DEFAULT_MARGEM)
    setPrecoManual(null)
  }

  if (carregando) {
    return (
      <>
        <TelaCarregando />
        <Rodape />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Suspense fallback={<TelaCarregando />}>
          <LoginView />
        </Suspense>
        <Rodape />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-elo-bg pb-14">
      <Header view={view} onViewChange={setView} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {view === 'estoque' ? (
          <Suspense fallback={<TelaCarregando />}>
            <EstoqueView />
          </Suspense>
        ) : view === 'vendas' ? (
          <Suspense fallback={<TelaCarregando />}>
            <VendasView />
          </Suspense>
        ) : view === 'historico' ? (
          <Suspense fallback={<TelaCarregando />}>
            <HistoricoView />
          </Suspense>
        ) : view === 'configuracoes' ? (
          <Suspense fallback={<TelaCarregando />}>
            <ConfiguracoesView />
          </Suspense>
        ) : view === 'pedidos' ? (
          <Suspense fallback={<TelaCarregando />}>
            <PedidosView />
          </Suspense>
        ) : view === 'dashboard' ? (
          <Suspense fallback={<TelaCarregando />}>
            <DashboardView />
          </Suspense>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">
                  Calculadora de custos de impressão 3D
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Preencha os campos abaixo — os resultados são calculados em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-elo-border bg-surface-subtle px-4 py-2 text-xs font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary sm:flex"
              >
                <RotateCcw size={13} />
                Limpar tudo
              </button>
            </div>

            <div
              role="group"
              aria-label="Tipo de objeto"
              className="mb-6 inline-flex rounded-full border border-elo-border bg-surface-subtle p-1"
            >
              {[
                { valor: false, rotulo: 'Peça única' },
                { valor: true, rotulo: 'Objeto com partes' },
              ].map((opcao) => (
                <button
                  key={opcao.rotulo}
                  type="button"
                  aria-pressed={form.modoPartes === opcao.valor}
                  onClick={() => setForm({ ...form, modoPartes: opcao.valor })}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    form.modoPartes === opcao.valor
                      ? 'bg-elo-gradient text-white shadow-md'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <FilamentoSection data={form} onChange={setForm} />
                {form.modoPartes && (
                  <PartesSection data={form} onChange={setForm} resultadoPartes={results.partes} />
                )}
                <EnergiaSection data={form} onChange={setForm} />
                <CustosAdicionaisSection data={form} onChange={setForm} />

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-elo-border bg-surface-subtle px-4 py-2.5 text-xs font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary sm:hidden"
                >
                  <RotateCcw size={13} />
                  Limpar tudo
                </button>
              </div>

              <ResultadoSection
                results={results}
                margem={margem}
                onMargemChange={handleMargemChange}
                precoManual={precoManual}
                onPrecoManualChange={setPrecoManual}
                hasError={results.hasError}
              />
            </div>
          </>
        )}
      </main>

      <Rodape />
    </div>
  )
}
