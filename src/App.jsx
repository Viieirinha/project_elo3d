import { lazy, Suspense, useMemo, useState } from 'react'
import { RotateCcw, Loader2 } from 'lucide-react'
import Header from './components/Header.jsx'
import FilamentoSection, { criarFilamentoVazio } from './components/FilamentoSection.jsx'
import EnergiaSection from './components/EnergiaSection.jsx'
import CustosAdicionaisSection from './components/CustosAdicionaisSection.jsx'
import ResultadoSection from './components/ResultadoSection.jsx'
import { useAuth } from './utils/AuthContext.jsx'
import { parseLocaleNumber } from './utils/format.js'

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
  return {
    quantidadePecas: '1',
    filamentos: [criarFilamentoVazio()],
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
  const [view, setView] = useState('calculadora')

  const results = useMemo(() => {
    const quantidadePecas = Math.max(1, parseLocaleNumber(form.quantidadePecas) || 1)

    const filamentos = form.filamentos.map((f) => ({
      precoRolo: parseLocaleNumber(f.precoRolo),
      pesoRolo: parseLocaleNumber(f.pesoRolo),
      filamentoUsado: parseLocaleNumber(f.filamentoUsado) / quantidadePecas,
      pesoRoloTexto: f.pesoRolo,
    }))
    const consumoW = parseLocaleNumber(form.consumoW)
    const horas = parseLocaleNumber(form.horas)
    const minutos = parseLocaleNumber(form.minutos)
    const valorKwh = parseLocaleNumber(form.valorKwh)
    const custoFixo = parseLocaleNumber(form.custoFixo)
    const maoDeObra = parseLocaleNumber(form.maoDeObra)

    const tempoTotalHoras = (horas + minutos / 60) / quantidadePecas
    const pesoRoloInvalido = filamentos.some((f) => f.pesoRoloTexto.trim() !== '' && f.pesoRolo <= 0)
    const tempoInvalido = (form.horas.trim() !== '' || form.minutos.trim() !== '') && tempoTotalHoras <= 0
    const hasError = pesoRoloInvalido || tempoInvalido

    const custoFilamento = filamentos.reduce(
      (acc, f) => acc + (f.pesoRolo > 0 ? (f.precoRolo / f.pesoRolo) * f.filamentoUsado : 0),
      0
    )
    const filamentoTotalUsado = filamentos.reduce((acc, f) => acc + f.filamentoUsado, 0)
    const custoEnergia = tempoTotalHoras > 0 ? (consumoW / 1000) * tempoTotalHoras * valorKwh : 0
    const custoTotal = custoFilamento + custoEnergia + custoFixo + maoDeObra
    const precoVenda = custoTotal * (1 + margem / 100)
    const custoPorGrama = filamentoTotalUsado > 0 ? custoTotal / filamentoTotalUsado : 0
    const custoPorHora = tempoTotalHoras > 0 ? custoTotal / tempoTotalHoras : 0

    return {
      quantidadePecas,
      custoFilamento,
      custoEnergia,
      custoFixo,
      maoDeObra,
      custoTotal,
      precoVenda,
      custoPorGrama,
      custoPorHora,
      hasError,
    }
  }, [form, margem])

  function handleReset() {
    setForm(criarEstadoPadrao())
    setMargem(DEFAULT_MARGEM)
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <FilamentoSection data={form} onChange={setForm} />
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
                onMargemChange={setMargem}
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
