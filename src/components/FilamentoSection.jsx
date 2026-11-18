import { Disc3, Plus, Trash2 } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import { Campo, Input } from './ui/Field.jsx'
import { criarFilamentoVazio } from '../utils/filamento.js'

export { criarFilamentoVazio }

export const nomeDoFilamento = (filamento, index) => filamento.nome?.trim() || `Filamento ${index + 1}`

export default function FilamentoSection({ data, onChange }) {
  const filamentos = data.filamentos
  const quantidadePecas = parseInt(data.quantidadePecas, 10)
  const emLote = quantidadePecas > 1
  const modoPartes = Boolean(data.modoPartes)

  const atualizar = (id, campo, valor) =>
    onChange({ ...data, filamentos: filamentos.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)) })
  const adicionar = () => onChange({ ...data, filamentos: [...filamentos, criarFilamentoVazio()] })
  const remover = (id) => onChange({ ...data, filamentos: filamentos.filter((f) => f.id !== id) })

  return (
    <SectionCard
      icon={<Disc3 size={18} />}
      title={modoPartes ? 'Filamentos' : 'Filamento'}
      subtitle={
        modoPartes ? 'Cadastre os rolos; as gramas de cada parte vão em "Partes do objeto"' : 'Custo do material usado na peça'
      }
    >
      {!modoPartes && (
        <div className="rounded-xl border border-elo-border bg-surface-subtle p-4">
          <NumberField
            label="Quantidade de peças nesta impressão"
            suffix="un."
            value={data.quantidadePecas}
            onChange={(v) => onChange({ ...data, quantidadePecas: v.replace(/[^0-9]/g, '') })}
            placeholder="1"
            tooltip="Se você imprime várias peças de uma vez, informe quantas saíram dessa impressão. O peso do filamento e o tempo de impressão informados abaixo serão tratados como o total da impressão e divididos automaticamente entre as peças."
          />
          {emLote && (
            <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
              Informe abaixo o peso final e o tempo total mostrados na impressora — o custo por peça será calculado
              dividindo por {quantidadePecas}.
            </p>
          )}
        </div>
      )}

      {filamentos.map((filamento, index) => (
        <div key={filamento.id} className={index > 0 ? 'border-t border-elo-border pt-5' : undefined}>
          {(filamentos.length > 1 || modoPartes) && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {modoPartes ? nomeDoFilamento(filamento, index) : `Filamento ${index + 1}`}
              </span>
              {filamentos.length > 1 && (
                <IconButton
                  icone={Trash2}
                  tamanho="sm"
                  variante="danger"
                  rotulo={`Remover filamento ${index + 1}`}
                  onClick={() => remover(filamento.id)}
                />
              )}
            </div>
          )}

          {modoPartes && (
            <Campo rotulo="Nome / cor (opcional)" className="mb-4">
              <Input
                value={filamento.nome}
                onChange={(e) => atualizar(filamento.id, 'nome', e.target.value)}
                placeholder="Ex: PLA branco"
              />
            </Campo>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Preço do rolo"
              prefix="R$"
              value={filamento.precoRolo}
              onChange={(v) => atualizar(filamento.id, 'precoRolo', v)}
              placeholder="120,00"
              tooltip="Valor pago pelo rolo de filamento completo."
            />
            <NumberField
              label="Peso do rolo"
              suffix="g"
              value={filamento.pesoRolo}
              onChange={(v) => atualizar(filamento.id, 'pesoRolo', v)}
              placeholder="1000"
              tooltip="Peso total do rolo de filamento, geralmente 1000g (1kg)."
            />
          </div>

          {!modoPartes && (
            <div className="mt-4">
              <NumberField
                label={emLote ? 'Filamento usado nesta impressão (total)' : 'Filamento usado nesta peça'}
                suffix="g"
                value={filamento.filamentoUsado}
                onChange={(v) => atualizar(filamento.id, 'filamentoUsado', v)}
                placeholder="20"
                tooltip={
                  emLote
                    ? `Peso total (em gramas) mostrado na impressora para as ${quantidadePecas} peças juntas. Será dividido automaticamente.`
                    : 'Quantidade de filamento, em gramas, consumida para imprimir esta peça específica.'
                }
              />
            </div>
          )}
        </div>
      ))}

      <Button icone={Plus} onClick={adicionar} className="border-dashed" bloco>
        {modoPartes ? 'Adicionar outro filamento' : 'Adicionar filamento (multicor)'}
      </Button>
    </SectionCard>
  )
}
