import { useEffect, useState } from 'react'
import { Settings, AlertTriangle, Tag, Plus, X } from 'lucide-react'
import { getEstoqueMinimo, setEstoqueMinimo } from '../utils/config.js'
import { getCategorias, adicionarCategoria, removerCategoria } from '../utils/categorias.js'

export default function ConfiguracoesView() {
  const [estoqueMinimo, setEstoqueMinimoState] = useState(5)
  const [categorias, setCategorias] = useState([])
  const [novaCategoria, setNovaCategoria] = useState('')

  useEffect(() => {
    getEstoqueMinimo().then(setEstoqueMinimoState)
    getCategorias().then(setCategorias)
  }, [])

  function handleAlterar(valor) {
    const numero = parseInt(valor, 10)
    const seguro = isNaN(numero) ? 0 : Math.max(0, numero)
    setEstoqueMinimoState(seguro)
    setEstoqueMinimo(seguro)
  }

  async function handleAdicionarCategoria(e) {
    e.preventDefault()
    if (!novaCategoria.trim()) return
    setCategorias(await adicionarCategoria(novaCategoria))
    setNovaCategoria('')
  }

  async function handleRemoverCategoria(nome) {
    setCategorias(await removerCategoria(nome))
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-ink-primary sm:text-2xl">Configurações</h1>
        <p className="mt-1 text-sm text-ink-muted">Preferências gerais do sistema.</p>
      </div>

      <div className="flex max-w-lg flex-col gap-6">
        <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elo-gradient shadow-md">
              <Settings size={19} className="text-white" />
            </div>
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">Estoque</h2>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
              <AlertTriangle size={13} />
              Alertar quando o estoque de um produto for menor que
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={estoqueMinimo}
                onChange={(e) => handleAlterar(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-24 rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
              />
              <span className="text-sm text-ink-muted">unidades</span>
            </div>
          </label>
        </section>

        <section className="rounded-2xl border border-elo-border bg-elo-card/80 p-5 shadow-lg shadow-black/20 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-elo-green to-elo-blue shadow-md">
              <Tag size={19} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-[15px] font-semibold text-ink-primary">Categorias</h2>
              <p className="text-xs text-ink-muted">Organize produtos de nichos diferentes.</p>
            </div>
          </div>

          <form onSubmit={handleAdicionarCategoria} className="flex items-center gap-2">
            <input
              type="text"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Ex: Chaveiros, Miniaturas, Decoração..."
              className="flex-1 rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25"
            />
            <button
              type="submit"
              disabled={!novaCategoria.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-elo-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </form>

          {categorias.length === 0 ? (
            <p className="mt-4 text-xs text-ink-muted">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {categorias.map((c) => (
                <div
                  key={c}
                  className="flex items-center gap-1.5 rounded-full border border-elo-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-secondary"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => handleRemoverCategoria(c)}
                    className="text-ink-muted transition-colors hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
