import { RotateCcw, Box, Boxes } from 'lucide-react'
import FilamentoSection from './FilamentoSection.jsx'
import EnergiaSection from './EnergiaSection.jsx'
import CustosAdicionaisSection from './CustosAdicionaisSection.jsx'
import PartesSection from './PartesSection.jsx'
import ResultadoSection from './ResultadoSection.jsx'
import PageHeader from './ui/PageHeader.jsx'
import Segmented from './ui/Segmented.jsx'
import Button from './ui/Button.jsx'

const MODOS = [
  { valor: false, rotulo: 'Peça única', icone: Box },
  { valor: true, rotulo: 'Objeto com partes', icone: Boxes },
]

export default function CalculadoraView({
  form,
  onFormChange,
  results,
  margem,
  onMargemChange,
  precoManual,
  onPrecoManualChange,
  onReset,
}) {
  return (
    <div className="animate-fade-in">
      <PageHeader
        titulo="Calculadora de custos"
        subtitulo="Preencha os campos — os resultados são calculados em tempo real."
        acoes={
          <>
            <Segmented
              rotulo="Tipo de objeto"
              opcoes={MODOS}
              valor={form.modoPartes}
              onChange={(v) => onFormChange({ ...form, modoPartes: v })}
            />
            <Button icone={RotateCcw} onClick={onReset}>
              Limpar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <FilamentoSection data={form} onChange={onFormChange} />
          {form.modoPartes && <PartesSection data={form} onChange={onFormChange} resultadoPartes={results.partes} />}
          <EnergiaSection data={form} onChange={onFormChange} />
          <CustosAdicionaisSection data={form} onChange={onFormChange} />
        </div>

        <ResultadoSection
          results={results}
          margem={margem}
          onMargemChange={onMargemChange}
          precoManual={precoManual}
          onPrecoManualChange={onPrecoManualChange}
          hasError={results.hasError}
        />
      </div>
    </div>
  )
}
