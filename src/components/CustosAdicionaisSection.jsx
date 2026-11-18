import { Wrench } from 'lucide-react'
import SectionCard from './ui/SectionCard.jsx'
import NumberField from './ui/NumberField.jsx'

export default function CustosAdicionaisSection({ data, onChange }) {
  return (
    <SectionCard icon={<Wrench size={18} />} title="Custos adicionais" subtitle="Desgaste, embalagem e tempo de trabalho">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Custo fixo"
          prefix="R$"
          value={data.custoFixo}
          onChange={(v) => onChange({ ...data, custoFixo: v })}
          placeholder="0,00"
          tooltip="Desgaste da impressora, manutenção, embalagem, etc."
        />
        <NumberField
          label="Mão de obra"
          prefix="R$"
          value={data.maoDeObra}
          onChange={(v) => onChange({ ...data, maoDeObra: v })}
          placeholder="0,00"
          tooltip="Valor cobrado pelo seu tempo de trabalho na peça: modelagem, acabamento, montagem, etc."
        />
      </div>
      <NumberField
        label="Depreciação da máquina"
        prefix="R$"
        suffix="/ hora"
        value={data.depreciacaoHora}
        onChange={(v) => onChange({ ...data, depreciacaoHora: v })}
        placeholder="0,00"
        tooltip="Desgaste da impressora por hora de impressão. Exemplo: preço da impressora ÷ vida útil estimada em horas (R$ 4.000 ÷ 5.000 h = R$ 0,80/h). É multiplicado pelo tempo de impressão."
      />
    </SectionCard>
  )
}
