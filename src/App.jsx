import { lazy, Suspense, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import AppShell from './components/AppShell.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import CalculadoraView from './components/CalculadoraView.jsx'
import { criarFilamentoVazio } from './components/FilamentoSection.jsx'
import { criarParteVazia } from './components/PartesSection.jsx'
import { SkeletonCards } from './components/ui/Skeleton.jsx'
import { useAuth } from './utils/AuthContext.jsx'
import { calcularResultado } from './utils/calculo.js'

const LoginView = lazy(() => import('./components/LoginView.jsx'))
const EstoqueView = lazy(() => import('./components/EstoqueView.jsx'))
const VendasView = lazy(() => import('./components/VendasView.jsx'))
const HistoricoView = lazy(() => import('./components/HistoricoView.jsx'))
const ConfiguracoesView = lazy(() => import('./components/ConfiguracoesView.jsx'))
const PedidosView = lazy(() => import('./components/PedidosView.jsx'))
const DashboardView = lazy(() => import('./components/DashboardView.jsx'))

const TELAS = {
  estoque: EstoqueView,
  vendas: VendasView,
  historico: HistoricoView,
  configuracoes: ConfiguracoesView,
  pedidos: PedidosView,
  dashboard: DashboardView,
}

function TelaCarregando() {
  return (
    <div role="status" aria-label="Carregando" className="flex min-h-screen items-center justify-center bg-elo-bg">
      <Loader2 size={28} className="animate-spin text-elo-blue" />
    </div>
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
  // O estado da calculadora fica aqui para não se perder ao trocar de tela.
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

  if (carregando) return <TelaCarregando />

  if (!user) {
    return (
      <Suspense fallback={<TelaCarregando />}>
        <LoginView />
      </Suspense>
    )
  }

  const Tela = TELAS[view]

  return (
    <AppShell view={view} onViewChange={setView}>
      <ErrorBoundary key={view}>
        {Tela ? (
          <Suspense fallback={<SkeletonCards quantidade={3} altura="h-40" />}>
            <Tela />
          </Suspense>
        ) : (
          <CalculadoraView
            form={form}
            onFormChange={setForm}
            results={results}
            margem={margem}
            onMargemChange={handleMargemChange}
            precoManual={precoManual}
            onPrecoManualChange={setPrecoManual}
            onReset={handleReset}
          />
        )}
      </ErrorBoundary>
    </AppShell>
  )
}
