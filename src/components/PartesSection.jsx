import { Boxes, Plus, Trash2 } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'
import { formatBRL } from '../utils/format.js'

export function criarParteVazia(filamentoId = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: '',
    quantidade: '1',
    gramas: '',
    filamentoId,
    horas: '',
    minutos: '',
  }
}

export const nomeDoFilamento = (filamento, index) => filamento.nome?.trim() || `Filamento ${index + 1}`

const campoTexto =
  'rounded-xl border border-elo-border bg-surface-subtle px-3 py-2.5 text-[15px] font-medium text-ink-primary placeholder-ink-muted outline-none transition-all focus:border-transparent focus:shadow-[0_0_0_1.5px_rgba(93,95,239,0.9)] focus:ring-2 focus:ring-[#5D5FEF]/25'

export default function PartesSection({ data, onChange, resultadoPartes }) {
  const { partes, filamentos } = data

  function atualizar(id, campo, valor) {
    onChange({ ...data, partes: partes.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) })
  }

  function adicionar() {
    onChange({ ...data, partes: [...partes, criarParteVazia(filamentos[0]?.id)] })
  }

  function remover(id) {
    onChange({ ...data, partes: partes.filter((p) => p.id !== id) })
  }

  return (
    <SectionCard
      icon={<Boxes size={19} className="text-white" />}
      title="Partes do objeto"
      subtitle="Cada parte com suas gramas, filamento e tempo de impressão"
      accent="from-elo-magenta to-elo-pink"
    >
      {partes.map((parte, index) => {
        const calculada = resultadoPartes?.find((r) => r.id === parte.id)
        return (
          <div key={parte.id} className={index > 0 ? 'border-t border-elo-border/60 pt-4' : undefined}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Parte {index + 1}</span>
              <div className="flex items-center gap-2">
                {calculada && (
                  <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                    Custo: {formatBRL(calculada.custoUnitario)}
                    {calculada.quantidade > 1 && ' cada'}
                  </span>
                )}
                {partes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remover(parte.id)}
                    aria-label={`Remover parte ${index + 1}`}
                    className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                <span className="text-[13px] font-medium text-ink-secondary">Nome da parte</span>
                <input
                  type="text"
                  value={parte.nome}
                  onChange={(e) => atualizar(parte.id, 'nome', e.target.value)}
                  placeholder={`Ex: ${index === 0 ? 'Base' : 'Tampa'}`}
                  className={campoTexto}
                />
              </label>
              <NumberField
                label="Quantidade"
                suffix="un."
                value={parte.quantidade}
                onChange={(v) => atualizar(parte.id, 'quantidade', v.replace(/[^0-9]/g, ''))}
                placeholder="1"
                tooltip="Quantas vezes esta parte aparece no objeto (ex.: 4 rodas). O custo é multiplicado por este número."
              />
              <NumberField
                label="Filamento usado"
                suffix="g"
                value={parte.gramas}
                onChange={(v) => atualizar(parte.id, 'gramas', v)}
                placeholder="20"
                tooltip="Gramas de filamento de UMA unidade desta parte."
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-secondary">Filamento</span>
                <select
                  value={parte.filamentoId}
                  onChange={(e) => atualizar(parte.id, 'filamentoId', e.target.value)}
                  className={`${campoTexto} text-sm`}
                >
                  {filamentos.map((f, i) => (
                    <option key={f.id} value={f.id}>
                      {nomeDoFilamento(f, i)}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Tempo — horas"
                suffix="h"
                value={parte.horas}
                onChange={(v) => atualizar(parte.id, 'horas', v)}
                placeholder="1"
                tooltip="Tempo de impressão de UMA unidade desta parte."
              />
              <NumberField
                label="Minutos"
                suffix="min"
                value={parte.minutos}
                onChange={(v) => atualizar(parte.id, 'minutos', v)}
                placeholder="30"
              />
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={adicionar}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-elo-border bg-surface-subtle px-3 py-2.5 text-xs font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary"
      >
        <Plus size={14} />
        Adicionar parte
      </button>
    </SectionCard>
  )
}
