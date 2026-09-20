import { useState } from 'react'
import { Sparkles, TrendingUp, Layers, Zap, Wrench, Clock, Weight, PackagePlus, Check } from 'lucide-react'
import { formatBRL, formatNumber } from '../utils/format.js'
import { registrarProduto } from '../utils/estoque.js'
import RegistrarProdutoModal from './RegistrarProdutoModal.jsx'

const MARGIN_PRESETS = [40, 70, 100, 150]

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

export default function ResultadoSection({ results, margem, onMargemChange, hasError }) {
  const {
    quantidadePecas,
    custoFilamento,
    custoEnergia,
    custoFixo,
    maoDeObra,
    custoTotal,
    precoVenda,
    custoPorGrama,
    custoPorHora,
  } = results
  const emLote = quantidadePecas > 1

  const [modalAberto, setModalAberto] = useState(false)
  const [confirmado, setConfirmado] = useState(false)

  async function handleSalvarProduto(produto) {
    await registrarProduto(produto)
    setModalAberto(false)
    setConfirmado(true)
    setTimeout(() => setConfirmado(false), 2500)
  }

  return (
    <section className="rounded-2xl border border-elo-border bg-elo-card/80 backdrop-blur-sm p-5 sm:p-6 shadow-lg shadow-black/20 animate-fade-in lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elo-gradient shadow-md">
          <Sparkles size={19} className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-primary">Resultado</h2>
          <p className="text-xs text-ink-muted">Custos e preço de venda sugerido</p>
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
          Custo total{emLote && <span className="text-ink-muted"> (por peça)</span>}
        </span>
        <span className="font-display text-base font-bold text-ink-primary">{formatBRL(custoTotal)}</span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[13px] font-medium text-ink-secondary">Margem de lucro</label>
          <span className="rounded-md bg-surface-hover px-2 py-0.5 font-display text-sm font-bold text-ink-primary">
            {formatNumber(margem, 0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1500}
          step={5}
          value={margem}
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
                margem === m
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
        <p className="relative text-xs font-medium uppercase tracking-wider text-zinc-400">
          Preço de venda sugerido{emLote && ' (por peça)'}
        </p>
        <p className="relative mt-1 font-display text-4xl font-bold tracking-tight gradient-text sm:text-5xl">
          {formatBRL(precoVenda)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
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
      />
    </section>
  )
}
