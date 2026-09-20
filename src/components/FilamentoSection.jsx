import { Disc3, Plus, Trash2 } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'

function gerarIdFilamento() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function criarFilamentoVazio() {
  return { id: gerarIdFilamento(), precoRolo: '', pesoRolo: '', filamentoUsado: '' }
}

export default function FilamentoSection({ data, onChange }) {
  const filamentos = data.filamentos
  const quantidadePecas = parseInt(data.quantidadePecas, 10)
  const emLote = quantidadePecas > 1

  function atualizarFilamento(id, campo, valor) {
    onChange({
      ...data,
      filamentos: filamentos.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    })
  }

  function adicionarFilamento() {
    onChange({ ...data, filamentos: [...filamentos, criarFilamentoVazio()] })
  }

  function removerFilamento(id) {
    onChange({ ...data, filamentos: filamentos.filter((f) => f.id !== id) })
  }

  return (
    <SectionCard
      icon={<Disc3 size={19} className="text-white" />}
      title="Filamento"
      subtitle="Custo do material usado na peça"
      accent="from-elo-blue to-elo-magenta"
    >
      <div className="rounded-xl border border-elo-border bg-surface-subtle p-3.5">
        <NumberField
          label="Quantidade de peças nesta impressão"
          suffix="un."
          value={data.quantidadePecas}
          onChange={(v) => onChange({ ...data, quantidadePecas: v.replace(/[^0-9]/g, '') })}
          placeholder="1"
          tooltip="Se você imprime várias peças de uma vez, informe quantas saíram dessa impressão. O peso do filamento e o tempo de impressão informados abaixo serão tratados como o total da impressão e divididos automaticamente entre as peças."
        />
        {emLote && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            Informe abaixo o peso final e o tempo total mostrados na impressora — o custo por
            peça será calculado automaticamente dividindo por {quantidadePecas}.
          </p>
        )}
      </div>

      {filamentos.map((filamento, index) => (
        <div key={filamento.id} className={index > 0 ? 'border-t border-elo-border/60 pt-4' : undefined}>
          {filamentos.length > 1 && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Filamento {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removerFilamento(filamento.id)}
                className="flex items-center gap-1 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Preço do rolo"
              prefix="R$"
              value={filamento.precoRolo}
              onChange={(v) => atualizarFilamento(filamento.id, 'precoRolo', v)}
              placeholder="120,00"
              tooltip="Valor pago pelo rolo de filamento completo."
            />
            <NumberField
              label="Peso do rolo"
              suffix="g"
              value={filamento.pesoRolo}
              onChange={(v) => atualizarFilamento(filamento.id, 'pesoRolo', v)}
              placeholder="1000"
              tooltip="Peso total do rolo de filamento, geralmente 1000g (1kg)."
            />
          </div>
          <div className="mt-4">
            <NumberField
              label={emLote ? 'Filamento usado nesta impressão (total)' : 'Filamento usado nesta peça'}
              suffix="g"
              value={filamento.filamentoUsado}
              onChange={(v) => atualizarFilamento(filamento.id, 'filamentoUsado', v)}
              placeholder="20"
              tooltip={
                emLote
                  ? `Peso total (em gramas) mostrado na impressora para as ${quantidadePecas} peças juntas. Será dividido automaticamente.`
                  : 'Quantidade de filamento, em gramas, consumida para imprimir esta peça específica.'
              }
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionarFilamento}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-elo-border bg-surface-subtle px-3 py-2.5 text-xs font-medium text-ink-secondary transition-colors hover:border-elo-border-strong hover:text-ink-primary"
      >
        <Plus size={14} />
        Adicionar filamento (multicor)
      </button>
    </SectionCard>
  )
}
