// Registro de eventos. Qualquer segredo (checkCode, token do agente) é substituído por *** antes de escrever,
// mesmo que alguma mensagem de erro de biblioteca o inclua por engano.
import { appendFileSync, existsSync, renameSync, statSync } from 'node:fs'

const MAX_ARQUIVO = 1_000_000 // ~1 MB; ao passar disso o arquivo vira agente.log.1

export function criarLogger({ segredos = [], arquivo = null, saida = console, agora = () => new Date() } = {}) {
  const lista = segredos.filter((s) => typeof s === 'string' && s.length >= 4)
  const ocultar = (texto) => lista.reduce((t, s) => t.split(s).join('***'), String(texto))

  function escrever(nivel, mensagem) {
    const linha = `${agora().toISOString()} [${nivel}] ${ocultar(mensagem)}`
    ;(nivel === 'erro' || nivel === 'aviso' ? saida.error : saida.log)(linha)
    if (arquivo) {
      try {
        if (existsSync(arquivo) && statSync(arquivo).size > MAX_ARQUIVO) renameSync(arquivo, `${arquivo}.1`)
        appendFileSync(arquivo, `${linha}\n`)
      } catch {
        /* falha ao gravar o arquivo de log não pode derrubar o agente */
      }
    }
  }
  return { info: (m) => escrever('info', m), aviso: (m) => escrever('aviso', m), erro: (m) => escrever('erro', m), ocultar }
}
