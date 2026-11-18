// Cliente HTTP fino da API local da Flashforge (não oficial; documentação comunitária).
// Faz só a chamada e a leitura do envelope { code, message, ... }. Interpretar os campos é com o normalizador.
//
// SEGURANÇA: o checkCode só é enviado no corpo da requisição à impressora e nunca aparece em mensagens de erro.
import { ErroImpressora } from './erros.js'
import { ipLocalValido } from '../../rede.js'

const MAX_RESPOSTA = 2_000_000 // 2 MB: a lista de arquivos é a maior resposta esperada

export class ClienteFlashforge {
  /**
   * @param {object} o
   * @param {string} o.checkCode
   * @param {number} [o.timeoutMs]
   * @param {typeof fetch} [o.fetchImpl]
   */
  constructor({ checkCode, timeoutMs = 4000, fetchImpl = fetch }) {
    this.checkCode = checkCode
    this.timeoutMs = timeoutMs
    this.fetch = fetchImpl
  }

  /** POST num endpoint da impressora e devolve o JSON já com o envelope verificado. */
  async postar(alvo, caminho) {
    if (!ipLocalValido(alvo?.ip)) {
      throw new ErroImpressora('offline', 'O IP da impressora não é um endereço da rede local; ajuste em Configurações.')
    }
    const url = `http://${alvo.ip.trim()}:${alvo.porta ?? 8898}${caminho}`
    const controle = new AbortController()
    const temporizador = setTimeout(() => controle.abort(), this.timeoutMs)
    let resposta
    let texto
    try {
      resposta = await this.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: alvo.numeroSerie, checkCode: this.checkCode }),
        signal: controle.signal,
      })
      texto = await resposta.text()
    } catch {
      // Qualquer falha de rede/tempo esgotado: impressora desligada, IP errado, fora da rede. (Sem repassar o erro
      // original: ele pode conter a URL/corpo.)
      throw new ErroImpressora('offline', `A impressora não respondeu em ${alvo.ip}:${alvo.porta ?? 8898}. Confira se está ligada, na mesma rede e com o IP correto.`)
    } finally {
      clearTimeout(temporizador)
    }

    if (!resposta.ok) throw new ErroImpressora('firmware', `Resposta inesperada da impressora (HTTP ${resposta.status}).`)
    if (texto.length > MAX_RESPOSTA) throw new ErroImpressora('firmware', 'Resposta da impressora grande demais.')
    let dados
    try {
      dados = JSON.parse(texto)
    } catch {
      throw new ErroImpressora('firmware', 'A impressora respondeu algo que não é JSON. O firmware pode ser incompatível.')
    }
    if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) {
      throw new ErroImpressora('firmware', 'Formato de resposta inesperado da impressora.')
    }

    // Envelope: a API sempre responde HTTP 200 e informa o resultado em "code".
    switch (dados.code) {
      case 0:
        return dados
      case 1:
        throw new ErroImpressora('credencial', 'Número de série ou checkCode incorretos. Confira os dados no menu da impressora.')
      case -2:
        throw new ErroImpressora('lan', 'A impressora recusou a conexão (modo LAN desativado). Ative o modo "LAN Only" na impressora e reinicie-a.')
      case -1:
        throw new ErroImpressora('firmware', 'A impressora recusou os parâmetros da consulta. O firmware pode ser diferente do esperado.')
      default:
        throw new ErroImpressora('firmware', `Código de resposta desconhecido da impressora (${String(dados.code).slice(0, 20)}).`)
    }
  }

  /** Estado atual da impressora. */
  async detalhe(alvo) {
    const dados = await this.postar(alvo, '/detail')
    if (dados.detail === null || typeof dados.detail !== 'object' || Array.isArray(dados.detail)) {
      throw new ErroImpressora('firmware', 'A resposta não trouxe os dados de estado esperados (campo "detail").')
    }
    return dados.detail
  }

  /** Lista de arquivos impressos/imprimíveis, com o filamento estimado de cada um. */
  async listaDeArquivos(alvo) {
    const dados = await this.postar(alvo, '/gcodeList')
    return Array.isArray(dados.gcodeListDetail) ? dados.gcodeListDetail : []
  }
}
