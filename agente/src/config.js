// Configuração do agente: variáveis de ambiente, com o arquivo .env (ao lado de package.json) como alternativa.
// Mensagens de erro nunca incluem os valores dos segredos.
import { existsSync, readFileSync } from 'node:fs'

export class ErroConfig extends Error {
  constructor(mensagem) {
    super(mensagem)
    this.name = 'ErroConfig'
  }
}

/** Lê o texto de um .env: linhas CHAVE=valor, # comentários, aspas opcionais. */
export function lerEnv(conteudo) {
  const saida = {}
  for (const linhaBruta of String(conteudo).split(/\r?\n/)) {
    const linha = linhaBruta.trim()
    if (!linha || linha.startsWith('#')) continue
    const i = linha.indexOf('=')
    if (i < 1) continue
    let valor = linha.slice(i + 1).trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1)
    saida[linha.slice(0, i).trim()] = valor
  }
  return saida
}

const URL_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

export function carregarConfig({ env = process.env, arquivoEnv = null, exigirServidor = true } = {}) {
  const doArquivo = arquivoEnv && existsSync(arquivoEnv) ? lerEnv(readFileSync(arquivoEnv, 'utf8')) : {}
  const v = (chave) => (env[chave] ?? doArquivo[chave] ?? '').toString().trim()

  const urlApi = v('ELO_API_URL').replace(/\/+$/, '')
  const tokenAgente = v('ELO_AGENT_TOKEN')
  const checkCode = v('FF_CHECK_CODE')
  const problemas = []

  if (exigirServidor) {
    if (!urlApi) problemas.push('ELO_API_URL não definido (ex.: https://elo3d.wmbens.cloud)')
    else if (!/^https:\/\//i.test(urlApi) && !URL_LOCAL.test(urlApi)) problemas.push('ELO_API_URL precisa começar com https:// (o token não deve viajar sem criptografia)')
    if (!tokenAgente) problemas.push('ELO_AGENT_TOKEN não definido (gere em Configurações > Impressora, no sistema)')
    else if (!tokenAgente.startsWith('elo3d_ag_')) problemas.push('ELO_AGENT_TOKEN com formato inválido (deve começar com elo3d_ag_)')
  }
  if (!checkCode) problemas.push('FF_CHECK_CODE não definido (o código de verificação está no menu da impressora)')
  else if (!/^[A-Za-z0-9]{4,64}$/.test(checkCode)) problemas.push('FF_CHECK_CODE com formato inválido (use só letras e números)')

  const timeoutMs = Number(v('FF_TIMEOUT_MS')) || 4000
  if (timeoutMs < 500 || timeoutMs > 30_000) problemas.push('FF_TIMEOUT_MS deve estar entre 500 e 30000')

  if (problemas.length) throw new ErroConfig(`Configuração incompleta:\n - ${problemas.join('\n - ')}`)
  return { urlApi, tokenAgente, checkCode, timeoutMs, arquivoLog: v('ELO_LOG_ARQUIVO') || 'agente.log' }
}
