import { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  Layers,
  Zap,
  Wrench,
  Clock,
  Weight,
  PackagePlus,
  Check,
  Pencil,
  RotateCcw,
  Boxes,
} from 'lucide-react'
import { formatBRL, formatNumber, parseLocaleNumber } from '../utils/format.js'
import { registrarProduto } from '../utils/estoque.js'
import RegistrarProdutoModal from './RegistrarProdutoModal.jsx'

const MARGIN_PRESETS = [40, 70, 100, 150]
const MARGEM_MAXIMA_SLIDER = 1500

function LineItem({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-sm text-ink-secondary">
        <span className="text-ink-muted">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold text-ink-primary">{formatBRL(value)}</span>
    </div>
  )
}

const formatarPercentual = (v) => (v === null || !Number.isFinite(v) ? '—' : `${formatNumber(v, 1)}%`)
const corDoValor = (v) => (v === null ? 'text-ink-muted' : v < 0 ? 'text-red-400' : 'text-elo-green')

function Indicador({ rotulo, valor, texto }) {
  return (
    <div className="rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-center">
      <span className="block text-[10px] font-medium uppercase leading-tight tracking-wide text-ink-muted">{rotulo}</span>
      <p className={`mt-1 font-display text-[15px] font-bold ${corDoValor(valor)}`}>{texto}</p>
    </div>
  )
}

export default function ResultadoSection({ results, margem, onMargemChange, precoManual, onPrecoManualChange, hasError }) {
  const {
    modoPartes,
    partes,
    quantidadePecas,
    custoFilamento,
    custoEnergia,
    custoFixo,
    maoDeObra,
    custoTotal,
    precoSugerido,
    precoVenda,
    precoPersonalizado,
    lucro,
    margemSobreCusto,
    margemSobreVenda,
    custoPorGrama,
    custoPorHora,
  } = results
  const emLote = !modoPartes && quantidadePecas > 1
  const sufixo = modoPartes ? ' do objeto' : emLote ? ' (por peça)' : ''

  const [modalAberto, setModalAberto] = useState(false)
  const [confirmado, setConfirmado] = useState(false)

  async function handleSalvarProduto(produto) {
    await registrarProduto(produto)
    setModalAberto(false)
    setConfirmado(true)
    setTimeout(() => setConfirmado(false), 2500)
  }

  // Enquanto não há preço digitado, o campo mostra o sugerido; ao digitar vira preço personalizado.
  const valorDoCampo = precoManual !== null ? precoManual : formatNumber(precoSugerido, 2)

  function aoDigitarPreco(texto) {
    onPrecoManualChange(texto.replace(/[^0-9.,]/g, ''))
  }

  function aoSairDoCampo() {
    if (precoManual === null) return
    if (precoManual.trim() === '') return onPrecoManualChange(null)
    onPrecoManualChange(formatNumber(parseLocaleNumber(precoManual), 2))
  }

  const margemDoSlider = Math.min(MARGEM_MAXIMA_SLIDER, Math.max(0, margemSobreCusto ?? margem))

  return (
    <section className="rounded-2xl border border-elo-border bg-elo-card/80 backdrop-blur-sm p-5 sm:p-6 shadow-lg shadow-black/20 animate-fade-in lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elo-gradient shadow-md">
          <Sparkles size={19} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-primary">Resultado</h2>
          <p className="text-xs text-ink-muted">Custos e preço de venda</p>
        </div>
      </div>

      {emLote && (
        <div className="mb-4 rounded-xl border border-elo-blue/30 bg-elo-blue/10 px-3.5 py-2.5 text-xs font-medium text-elo-blue">
          Impressão em lote de {quantidadePecas} peças — todos os valores abaixo já são <strong>por peça</strong>.
        </div>
      )}

      {hasError && (
        <div className="mb-4 rounded-xl border border-elo-yellow/30 bg-elo-yellow/10 px-3.5 py-2.5 text-xs font-medium text-elo-yellow">
          Verifique os valores: peso do rolo e tempo de impressão não podem ser zero.
        </div>
      )}

      <div className="divide-y divide-elo-border/60 border-y border-elo-border/60">
        <LineItem icon={<Layers size={15} />} label="Custo do filamento" value={custoFilamento} />
        <LineItem icon={<Zap size={15} />} label="Custo de energia" value={custoEnergia} />
        <LineItem icon={<Wrench size={15} />} label="Custo fixo" value={custoFixo} />
        <LineItem icon={<TrendingUp size={15} />} label="Mão de obra" value={maoDeObra} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3">
        <span className="text-sm font-semibold text-ink-secondary">
          Custo total{modoPartes ? ' do objeto' : emLote ? <span className="text-ink-muted"> (por peça)</span> : ''}
        </span>
        <span className="font-display text-base font-bold text-ink-primary">{formatBRL(custoTotal)}</span>
      </div>

      {modoPartes && partes.length > 0 && (
        <div className="mt-4 rounded-xl border border-elo-border bg-surface-subtle p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            <Boxes size={12} /> Valor de cada parte
          </p>
          <ul className="divide-y divide-elo-border/60">
            {partes.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {p.nome}
                    {p.quantidade > 1 && <span className="text-ink-muted"> ×{p.quantidade}</span>}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    custo {formatBRL(p.custoUnitario)}
                    {p.quantidade > 1 && ` · total ${formatBRL(p.precoTotal)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink-primary">{formatBRL(p.precoUnitario)}</p>
                  {p.quantidade > 1 && <p className="text-[11px] text-ink-muted">cada</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t border-elo-border pt-2.5">
            <span className="text-sm font-semibold text-ink-secondary">Total do objeto</span>
            <span className="font-display text-sm font-bold text-ink-primary">{formatBRL(precoVenda)}</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="margem-slider" className="text-[13px] font-medium text-ink-secondary">
            Margem de lucro <span className="text-ink-muted">(sobre o custo)</span>
          </label>
          <span className="rounded-md bg-surface-hover px-2 py-0.5 font-display text-sm font-bold text-ink-primary">
            {formatarPercentual(margemSobreCusto)}
          </span>
        </div>
        <input
          id="margem-slider"
          type="range"
          min={0}
          max={MARGEM_MAXIMA_SLIDER}
          step={5}
          value={margemDoSlider}
          onChange={(e) => onMargemChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {MARGIN_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMargemChange(m)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                !precoPersonalizado && margem === m
                  ? 'border-transparent bg-elo-gradient text-white shadow-md'
                  : 'border-elo-border bg-surface-subtle text-ink-secondary hover:border-elo-border-strong hover:text-ink-primary'
              }`}
            >
              {m}%
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1b24] to-[#121319] p-5 text-center shadow-glow">
        <div className="pointer-events-none absolute -inset-16 opacity-20 blur-3xl bg-elo-gradient" />
        <label htmlFor="preco-venda" className="relative block text-xs font-medium uppercase tracking-wider text-zinc-400">
          {precoPersonalizado ? 'Preço de venda' : 'Preço de venda sugerido'}
          {sufixo}
        </label>
        <div className="relative mt-1 flex items-center justify-center gap-1 border-b border-dashed border-white/20 pb-1 focus-within:border-elo-blue">
          <span className="font-display text-xl font-bold text-zinc-400 sm:text-2xl">R$</span>
          <input
            id="preco-venda"
            type="text"
            inputMode="decimal"
            value={valorDoCampo}
            onChange={(e) => aoDigitarPreco(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={aoSairDoCampo}
            aria-label="Preço de venda (editável)"
            className="w-full min-w-0 bg-transparent text-center font-display text-4xl font-bold tracking-tight text-white outline-none sm:text-5xl"
          />
          <Pencil size={14} className="shrink-0 text-zinc-500" aria-hidden="true" />
        </div>
        <p className="relative mt-2 text-[11px] text-zinc-500">
          {precoPersonalizado ? (
            <>
              Preço personalizado ·{' '}
              <button
                type="button"
                onClick={() => onPrecoManualChange(null)}
                className="inline-flex items-center gap-1 font-medium text-elo-blue hover:underline"
              >
                <RotateCcw size={10} /> voltar ao sugerido ({formatBRL(precoSugerido)})
              </button>
            </>
          ) : (
            'Toque no valor para alterar o preço'
          )}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Indicador rotulo={lucro < 0 ? 'Prejuízo' : 'Lucro'} valor={lucro} texto={formatBRL(lucro)} />
        <Indicador rotulo="Margem s/ custo" valor={margemSobreCusto} texto={formatarPercentual(margemSobreCusto)} />
        <Indicador rotulo="Margem s/ venda" valor={margemSobreVenda} texto={formatarPercentual(margemSobreVenda)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-elo-border bg-surface-subtle px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <Weight size={12} /> Por grama
          </span>
          <p className="mt-1 font-display text-base font-bold text-ink-primary">{formatBRL(custoPorGrama)}</p>
        </div>
        <div className="rounded-xl border border-elo-border bg-surface-subtle px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            <Clock size={12} /> Por hora
          </span>
          <p className="mt-1 font-display text-base font-bold text-ink-primary">{formatBRL(custoPorHora)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-elo-border bg-surface-subtle px-4 py-3 text-sm font-semibold text-ink-secondary transition-colors hover:border-elo-border-strong hover:bg-surface-hover"
      >
        {confirmado ? (
          <>
            <Check size={16} className="text-elo-green" />
            Produto registrado!
          </>
        ) : (
          <>
            <PackagePlus size={16} />
            Registrar produto
          </>
        )}
      </button>

      <RegistrarProdutoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvarProduto}
        custoUnitario={custoTotal}
        precoVenda={precoVenda}
        partes={modoPartes ? partes : null}
      />
    </section>
  )
}
