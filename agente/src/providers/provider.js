// Interface PrinterProvider: o que o agente espera de QUALQUER integração de impressora.
//
// Para trocar a Flashforge por outra (ex.: Moonraker, porta 7125, se você instalar o firmware Zmod), crie uma
// pasta em src/providers/<nome>/ com uma classe que implemente isto e registre-a em PROVIDERS abaixo. O laço do
// agente, o servidor e a calculadora não mudam: todos só conhecem o "snapshot" neutro.
//
// @typedef {object} Snapshot
//   estado        'ociosa' | 'imprimindo' | 'aquecendo' | 'pausada' | 'erro' | 'ocupada' | 'concluida' |
//                 'cancelando' | 'cancelada' | 'desconhecido'
//   estadoBruto   texto original do firmware (para diagnóstico)
//   arquivo       nome do arquivo em impressão | null
//   progresso     0 a 1 | null
//   camadaAtual, camadaTotal   inteiros | null
//   decorridoSeg  segundos do job até agora | null       restanteSeg  segundos restantes | null
//   temperaturas  { bico, bicoDireito, mesa, camara }: cada um { atual, alvo } | null
//   codigoErro    string | null
//   filamento     { gramasEstimadas, ferramentas: [{ ferramenta, material, cor, gramas, slot }] } | null
//   medidoEm      ISO 8601
//
// @typedef {object} PrinterProvider
//   nome                        string
//   obterSnapshot(alvo)         Promise<Snapshot>; alvo = { ip, porta, numeroSerie }.
//                               Em caso de falha lança um erro com .codigo: 'offline' | 'credencial' | 'lan' | 'firmware'
import { ProviderFlashforge } from './flashforge/index.js'

export const PROVIDERS = {
  flashforge: (opcoes) => new ProviderFlashforge(opcoes),
}

export function criarProvider(nome, opcoes) {
  const fabrica = PROVIDERS[nome]
  if (!fabrica) throw new Error(`Modelo de impressora não suportado pelo agente: "${nome}". Disponíveis: ${Object.keys(PROVIDERS).join(', ')}.`)
  return fabrica(opcoes)
}
