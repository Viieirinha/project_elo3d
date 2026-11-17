import { Boxes, Plus, Trash2 } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'
import Button, { IconButton } from './ui/Button.jsx'
import Badge from './ui/Badge.jsx'
import { Campo, Input, Select } from './ui/Field.jsx'
import { formatBRL } from '../utils/format.js'
import { nomeDoFilamento } from './FilamentoSection.jsx'

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

export default function PartesSection({ data, onChange, resultadoPartes }) {
  const { partes, filamentos } = data

  const atualizar = (id, campo, valor) =>
    onChange({ ...data, partes: partes.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)) })
  const adicionar = () => onChange({ ...data, partes: [...partes, criarParteVazia(filamentos[0]?.id)] })
  const remover = (id) => onChange({ ...data, partes: partes.filter((p) => p.id !== id) })

  return (
    <SectionCard icon={<Boxes size={18} />} title="Partes do objeto" subtitle="Cada parte com suas gramas, filamento e tempo de impressão">
      {partes.map((parte, index) => {
        const calculada = resultadoPartes?.find((r) => r.id === parte.id)
        return (
          <div key={parte.id} className={index > 0 ? 'border-t border-elo-border pt-5' : undefined}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Parte {index + 1}</span>
              <div className="flex items-center gap-1.5">
                {calculada && (
                  <Badge tom="marca">
                    Custo {formatBRL(calculada.custoUnitario)}
                    {calculada.quantidade > 1 && ' cada'}
                  </Badge>
                )}
                {partes.length > 1 && (
                  <IconButton
                    icone={Trash2}
                    tamanho="sm"
                    variante="danger"
                    rotulo={`Remover parte ${index + 1}`}
                    onClick={() => remover(parte.id)}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <Campo rotulo="Nome da parte" className="col-span-2 sm:col-span-1">
                <Input
                  value={parte.nome}
                  onChange={(e) => atualizar(parte.id, 'nome', e.target.value)}
                  placeholder={`Ex: ${index === 0 ? 'Base' : 'Tampa'}`}
                />
              </Campo>
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
              <Campo rotulo="Filamento">
                <Select value={parte.filamentoId} onChange={(e) => atualizar(parte.id, 'filamentoId', e.target.value)}>
                  {filamentos.map((f, i) => (
                    <option key={f.id} value={f.id}>
                      {nomeDoFilamento(f, i)}
                    </option>
                  ))}
                </Select>
              </Campo>
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

      <Button icone={Plus} onClick={adicionar} className="border-dashed" bloco>
        Adicionar parte
      </Button>
    </SectionCard>
  )
}
