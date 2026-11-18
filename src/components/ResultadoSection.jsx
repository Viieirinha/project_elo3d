import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  Layers,
  Zap,
  Wrench,
  Clock,
  Weight,
  PackagePlus,
  Pencil,
  RotateCcw,
  Boxes,
  Printer,
} from 'lucide-react'
import { formatBRL, formatNumber, parseLocaleNumber } from '../utils/format.js'
import { registrarProduto } from '../utils/estoque.js'
import { useToast } from './ui/Toast.jsx'
import Button from './ui/Button.jsx'
import RegistrarProdutoModal from './RegistrarProdutoModal.jsx'

const MARGIN_PRESETS = [40, 70, 100, 150]
const MARGEM_MAXIMA_SLIDER = 1500

function LinhaCusto({ icone, rotulo, valor }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2.5 text-sm text-ink-secondary">
        <span className="text-ink-muted">{icone}</span>
        {rotulo}
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(valor)}</span>
    </div>
  )
}

const formatarPercentual = (v) => (v === null || !Number.isFinite(v) ? '—' : `${formatNumber(v, 1)}%`)
const corDoValor = (v) => (v === null ? 'text-ink-muted' : v < 0 ? 'text-red-400' : 'text-elo-green')

function Indicador({ rotulo, valor, texto }) {
  return (
    <div className="rounded-xl border border-elo-border bg-surface-subtle px-2.5 py-3 text-center">
      <span className="block text-[10px] font-semibold uppercase leading-tight tracking-wider text-ink-muted">{rotulo}</span>
      <p className={`mt-1.5 font-display text-[15px] font-semibold tabular-nums ${corDoValor(valor)}`}>{texto}</p>
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
    custoDepreciacao,
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

  const toast = useToast()
  const [modalAberto, setModalAberto] = useState(false)

  // O painel tem sempre a altura do conteúdo (sem rolagem interna). Ele só fica fixo na tela
  // (sticky) quando cabe inteiro nela; se for mais alto, rola junto com a página para que nada
  // fique escondido abaixo da dobra.
  const painelRef = useRef(null)
  const [podeFixar, setPodeFixar] = useState(false)
  useEffect(() => {
    const el = painelRef.current
    if (!el) return undefined
    const medir = () => setPodeFixar(window.matchMedia('(min-width: 1280px)').matches && el.offsetHeight <= window.innerHeight - 48)
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    window.addEventListener('resize', medir)
    medir()
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', medir)
    }
  }, [])

  async function handleSalvarProduto(produto) {
    await registrarProduto(produto)
    setModalAberto(false)
    toast.sucesso(`"${produto.nome}" registrado no estoque.`)
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
    <section ref={painelRef} className={`card animate-fade-in p-5 sm:p-6 xl:self-start ${podeFixar ? 'xl:sticky xl:top-6' : ''}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-elo-blue/10 text-elo-blue">
          <Sparkles size={18} />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink-primary">Resultado</h2>
          <p className="text-xs text-ink-muted">Custos e preço de venda</p>
        </div>
      </div>

      {emLote && (
        <div className="mb-4 rounded-xl border border-elo-blue/25 bg-elo-blue/10 px-3.5 py-2.5 text-xs font-medium text-elo-blue">
          Impressão em lote de {quantidadePecas} peças — todos os valores abaixo já são <strong>por peça</strong>.
        </div>
      )}

      {hasError && (
        <div role="alert" className="mb-4 rounded-xl border border-elo-yellow/30 bg-elo-yellow/10 px-3.5 py-2.5 text-xs font-medium text-elo-yellow">
          Verifique os valores: peso do rolo e tempo de impressão não podem ser zero.
        </div>
      )}

      <div className="divide-y divide-elo-border border-y border-elo-border">
        <LinhaCusto icone={<Layers size={15} />} rotulo="Custo do filamento" valor={custoFilamento} />
        <LinhaCusto icone={<Zap size={15} />} rotulo="Custo de energia" valor={custoEnergia} />
        <LinhaCusto icone={<Printer size={15} />} rotulo="Depreciação da máquina" valor={custoDepreciacao} />
        <LinhaCusto icone={<Wrench size={15} />} rotulo="Custo fixo" valor={custoFixo} />
        <LinhaCusto icone={<TrendingUp size={15} />} rotulo="Mão de obra" valor={maoDeObra} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-hover px-4 py-3">
        <span className="text-sm font-semibold text-ink-secondary">
          Custo total{modoPartes ? ' do objeto' : emLote ? <span className="text-ink-muted"> (por peça)</span> : ''}
        </span>
        <span className="font-display text-base font-semibold tabular-nums text-ink-primary">{formatBRL(custoTotal)}</span>
      </div>

      {modoPartes && partes.length > 0 && (
        <div className="mt-4 rounded-xl border border-elo-border bg-surface-subtle p-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <Boxes size={12} /> Valor de cada parte
          </p>
          <ul className="divide-y divide-elo-border">
            {partes.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {p.nome}
                    {p.quantidade > 1 && <span className="text-ink-muted"> ×{p.quantidade}</span>}
                  </p>
                  <p className="text-[11px] tabular-nums text-ink-muted">
                    custo {formatBRL(p.custoUnitario)}
                    {p.quantidade > 1 && ` · total ${formatBRL(p.precoTotal)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(p.precoUnitario)}</p>
                  {p.quantidade > 1 && <p className="text-[11px] text-ink-muted">cada</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-elo-border pt-3">
            <span className="text-sm font-semibold text-ink-secondary">Total do objeto</span>
            <span className="font-display text-sm font-semibold tabular-nums text-ink-primary">{formatBRL(precoVenda)}</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <label htmlFor="margem-slider" className="label">
            Margem de lucro <span className="font-normal text-ink-muted">(sobre o custo)</span>
          </label>
          <span className="rounded-lg bg-surface-hover px-2 py-0.5 font-display text-sm font-semibold tabular-nums text-ink-primary">
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
        <div className="mt-3.5 flex flex-wrap gap-2">
          {MARGIN_PRESETS.map((m) => {
            const ativo = !precoPersonalizado && margem === m
            return (
              <button
                key={m}
                type="button"
                aria-pressed={ativo}
                onClick={() => onMargemChange(m)}
                className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all duration-150 ${
                  ativo
                    ? 'border-transparent bg-elo-brand text-white shadow-brand'
                    : 'border-elo-border bg-surface-subtle text-ink-secondary hover:border-elo-border-strong hover:text-ink-primary'
                }`}
              >
                {m}%
              </button>
            )
          })}
        </div>
      </div>

      {/* Preço: o grande destaque da tela. Editável. */}
      <div className="relative mt-6 overflow-hidden rounded-2xl bg-elo-brand p-5 text-center text-white shadow-brand">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl"
        />
        <label htmlFor="preco-venda" className="relative block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
          {precoPersonalizado ? 'Preço de venda' : 'Preço de venda sugerido'}
          {sufixo}
        </label>
        <div className="relative mt-2 flex items-center justify-center gap-1 border-b border-dashed border-white/35 pb-1.5 transition-colors focus-within:border-white">
          <span className="font-display text-xl font-semibold text-white/75 sm:text-2xl">R$</span>
          <input
            id="preco-venda"
            type="text"
            inputMode="decimal"
            value={valorDoCampo}
            onChange={(e) => aoDigitarPreco(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={aoSairDoCampo}
            aria-label="Preço de venda (editável)"
            className="w-full min-w-0 bg-transparent text-center font-display text-4xl font-bold tabular-nums tracking-tight text-white outline-none sm:text-5xl"
          />
          <Pencil size={15} className="shrink-0 text-white/60" aria-hidden="true" />
        </div>
        <p className="relative mt-2.5 text-xs text-white/75">
          {precoPersonalizado ? (
            <>
              Preço personalizado ·{' '}
              <button
                type="button"
                onClick={() => onPrecoManualChange(null)}
                className="inline-flex items-center gap-1 font-semibold text-white underline-offset-2 hover:underline"
              >
                <RotateCcw size={11} /> voltar ao sugerido ({formatBRL(precoSugerido)})
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-elo-border bg-surface-subtle px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <Weight size={12} /> Por grama
          </span>
          <p className="mt-1 font-display text-base font-semibold tabular-nums text-ink-primary">{formatBRL(custoPorGrama)}</p>
        </div>
        <div className="rounded-xl border border-elo-border bg-surface-subtle px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <Clock size={12} /> Por hora
          </span>
          <p className="mt-1 font-display text-base font-semibold tabular-nums text-ink-primary">{formatBRL(custoPorHora)}</p>
        </div>
      </div>

      <Button variante="secondary" tamanho="lg" icone={PackagePlus} bloco className="mt-4" onClick={() => setModalAberto(true)}>
        Registrar produto
      </Button>

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
