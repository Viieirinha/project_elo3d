#!/usr/bin/env node
// Ponto de entrada do agente ELO 3D.
//   node src/index.js                  roda o agente (fica consultando a impressora)
//   node src/index.js --diagnostico    consulta a impressora uma vez e mostra o que ela devolve
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { carregarConfig, ErroConfig } from './config.js'
import { criarLogger } from './log.js'
import { criarApiElo } from './apiElo.js'
import { criarProvider } from './providers/provider.js'
import { ClienteFlashforge } from './providers/flashforge/cliente.js'
import { executarAgente } from './laco.js'
import { montarRelatorio } from './diagnostico.js'

// fileURLToPath resolve corretamente caminhos do Windows (C:\\Pasta com espaço\\agente\\.env).
const arquivoEnv = fileURLToPath(new URL('../.env', import.meta.url))
const args = process.argv.slice(2)
const valorDe = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined)

if (args.includes('--ajuda') || args.includes('-h')) {
  console.log('Uso: node src/index.js [--diagnostico [--ip 192.168.0.50 --serial SERIAL]]')
  process.exit(0)
}

const diagnostico = args.includes('--diagnostico')
let config
try {
  // No diagnóstico o servidor é opcional: com --ip e --serial só a impressora é consultada.
  config = carregarConfig({ arquivoEnv, exigirServidor: !(diagnostico && valorDe('--ip')) })
} catch (e) {
  if (e instanceof ErroConfig) {
    console.error(e.message)
    console.error('\nCopie .env.example para .env e preencha os valores. Veja o README.md.')
    process.exit(1)
  }
  throw e
}

const log = criarLogger({ segredos: [config.checkCode, config.tokenAgente], arquivo: config.arquivoLog })

if (diagnostico) {
  const api = config.tokenAgente ? criarApiElo({ url: config.urlApi, token: config.tokenAgente }) : null
  const alvo = valorDe('--ip') ? { ip: valorDe('--ip'), porta: 8898, numeroSerie: valorDe('--serial') } : (await api.obterConfig()).impressora
  const cliente = new ClienteFlashforge({ checkCode: config.checkCode, timeoutMs: config.timeoutMs })
  try {
    const relatorio = montarRelatorio(await cliente.detalhe(alvo))
    console.log(relatorio.texto)
    writeFileSync('diagnostico-detail.json', JSON.stringify(relatorio.arquivo, null, 2))
    console.log('\nGravei diagnostico-detail.json (serial, IP, MAC e códigos de registro ocultados).')
    process.exit(0)
  } catch (e) {
    console.error(`Falha: ${log.ocultar(e.message)}`)
    process.exit(2)
  }
}

const api = criarApiElo({ url: config.urlApi, token: config.tokenAgente })
const provider = criarProvider('flashforge', { checkCode: config.checkCode, timeoutMs: config.timeoutMs })
const controle = new AbortController()
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => controle.abort())

log.info('Agente ELO 3D iniciado.')
await executarAgente({ api, provider, log, sinal: controle.signal })
log.info('Agente encerrado.')
