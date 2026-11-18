// Provider da Flashforge (AD5X e similares). Implementa a interface PrinterProvider (ver ../provider.js).
import { ClienteFlashforge } from './cliente.js'
import { extrairFilamento, normalizarDetalhe } from './normalizador.js'

const ATIVOS = ['imprimindo', 'aquecendo', 'pausada']
const TENTATIVAS_FILAMENTO = 3 // por arquivo: evita sobrecarregar a impressora se a lista não ajudar
const ESPERA_ENTRE_TENTATIVAS_MS = 30_000

export class ProviderFlashforge {
  nome = 'flashforge'

  constructor({ checkCode, timeoutMs, fetchImpl, agora = () => Date.now() }) {
    this.cliente = new ClienteFlashforge({ checkCode, timeoutMs, fetchImpl })
    this.agora = agora
    this.filamentoPorArquivo = new Map() // arquivo -> { filamento, tentativas, ultimaTentativa }
  }

  /** @returns {Promise<object>} snapshot neutro. Lança ErroImpressora (offline, credencial, lan, firmware). */
  async obterSnapshot(alvo) {
    const detalhe = await this.cliente.detalhe(alvo)
    const snapshot = normalizarDetalhe(detalhe, new Date(this.agora()).toISOString())
    if (ATIVOS.includes(snapshot.estado) && snapshot.arquivo) {
      snapshot.filamento = await this.#filamentoDe(alvo, snapshot.arquivo)
    }
    return snapshot
  }

  async #filamentoDe(alvo, arquivo) {
    const registro = this.filamentoPorArquivo.get(arquivo) ?? { filamento: null, tentativas: 0, ultimaTentativa: 0 }
    if (registro.filamento) return registro.filamento
    const agora = this.agora()
    if (registro.tentativas >= TENTATIVAS_FILAMENTO || agora - registro.ultimaTentativa < ESPERA_ENTRE_TENTATIVAS_MS) return null
    registro.tentativas += 1
    registro.ultimaTentativa = agora
    try {
      registro.filamento = extrairFilamento(await this.cliente.listaDeArquivos(alvo), arquivo)
    } catch {
      // Sem dados de filamento não é falha do estado: o custo de material fica manual.
      registro.filamento = null
    }
    if (this.filamentoPorArquivo.size > 50) this.filamentoPorArquivo.clear() // não cresce sem limite
    this.filamentoPorArquivo.set(arquivo, registro)
    return registro.filamento
  }
}
