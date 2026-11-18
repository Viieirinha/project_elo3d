// Impressora falsa: um servidor HTTP local que imita a API da Flashforge para os testes.
import { createServer } from 'node:http'

/**
 * @param {(ctx: {caminho: string, corpo: object|null}) => {status?: number, json?: any, texto?: string, atrasoMs?: number}} resposta
 */
export async function iniciarImpressoraFalsa(resposta) {
  const requisicoes = []
  const servidor = createServer((req, res) => {
    let bruto = ''
    req.on('data', (c) => (bruto += c))
    req.on('end', async () => {
      let corpo = null
      try { corpo = JSON.parse(bruto) } catch { /* corpo não-JSON */ }
      requisicoes.push({ caminho: req.url, metodo: req.method, corpo, bruto })
      const r = resposta({ caminho: req.url, corpo })
      if (r.atrasoMs) await new Promise((ok) => setTimeout(ok, r.atrasoMs))
      if (r.semResposta) return // nunca responde (simula impressora travada)
      res.writeHead(r.status ?? 200, { 'Content-Type': 'application/json' })
      res.end(r.texto ?? JSON.stringify(r.json))
    })
  })
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
  return {
    porta: servidor.address().port,
    requisicoes,
    fechar: () => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(ok) }),
  }
}

/** Porta onde NINGUÉM está escutando (conexão recusada). */
export async function portaFechada() {
  const s = createServer()
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok))
  const porta = s.address().port
  await new Promise((ok) => s.close(ok))
  return porta
}
