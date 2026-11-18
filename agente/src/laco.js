// Laço principal do agente: consulta a impressora, envia o estado ao servidor e decide quando consultar de novo.
//
//  - O ritmo vem do servidor (rápido com job em andamento ou tela aberta; lento quando ocioso).
//  - Falha da impressora (offline, credencial...): avisa o servidor e recua (5 s, 10 s, 20 s, 40 s, 60 s...).
//  - Servidor fora do ar: recua do mesmo jeito; nunca derruba o agente.
//  - O IP vem do servidor a cada resposta: trocar o IP na tela vale na próxima consulta.
import { ErroServidor } from './apiElo.js'
import { esperar as esperarReal, recuoMs } from './rede.js'

const MIN_MS = 5_000
const MAX_MS = 120_000
const limitar = (ms) => Math.min(MAX_MS, Math.max(MIN_MS, Number(ms) || 30_000))

/**
 * @param {object} d
 * @param {object} d.api        cliente do servidor (obterConfig, enviarSnapshot, enviarFalha)
 * @param {object} d.provider   PrinterProvider (obterSnapshot(alvo))
 * @param {object} d.log
 * @param {AbortSignal} [d.sinal]
 * @param {Function} [d.esperar] injetável nos testes
 * @param {Function} [d.aleatorio]
 * @param {Function} [d.aoCiclo] observador (testes): recebe { alvo, falhasImpressora, falhasServidor, espera }
 */
export async function executarAgente({ api, provider, log, sinal, esperar = esperarReal, aleatorio = Math.random, aoCiclo }) {
  let alvo = null
  let falhasImpressora = 0
  let falhasServidor = 0
  let ultimoCodigo = null // evita repetir a mesma mensagem de erro no log a cada tentativa

  while (!sinal?.aborted) {
    let espera
    try {
      if (!alvo) alvo = (await api.obterConfig()).impressora

      if (!alvo.ativa) {
        espera = 60_000 // desativada no sistema: só confere de tempos em tempos
        alvo = null
      } else {
        let snapshot = null
        let falha = null
        try {
          snapshot = await provider.obterSnapshot(alvo)
        } catch (e) {
          falha = { codigo: e.codigo ?? 'servico', mensagem: e.codigo ? e.message : 'Erro inesperado no agente ao consultar a impressora.' }
          if (!e.codigo) log.erro(`Erro inesperado: ${e.message}`)
        }

        if (snapshot) {
          const r = await api.enviarSnapshot(snapshot)
          alvo = r.impressora ?? alvo
          if (falhasImpressora > 0 || ultimoCodigo) log.info('Impressora respondendo normalmente.')
          falhasImpressora = 0
          ultimoCodigo = null
          espera = limitar(r.proximoIntervaloMs)
        } else {
          falhasImpressora += 1
          if (falha.codigo !== ultimoCodigo) log.aviso(`Impressora: ${falha.mensagem}`)
          ultimoCodigo = falha.codigo
          const r = await api.enviarFalha(falha)
          alvo = r.impressora ?? alvo
          espera = Math.max(limitar(r.proximoIntervaloMs), recuoMs(falhasImpressora, aleatorio))
        }
        falhasServidor = 0
      }
    } catch (e) {
      if (e instanceof ErroServidor) {
        falhasServidor += 1
        if (e.status === 401) {
          log.erro('O servidor recusou o token do agente. Gere um novo em Configurações > Impressora e atualize o arquivo .env.')
          espera = 60_000
        } else {
          if (falhasServidor === 1) log.aviso(`Servidor ELO 3D: ${e.message}`)
          espera = recuoMs(falhasServidor, aleatorio)
        }
      } else {
        falhasServidor += 1
        log.erro(`Erro inesperado no agente: ${e.message}`)
        espera = recuoMs(falhasServidor, aleatorio)
      }
    }
    aoCiclo?.({ alvo, falhasImpressora, falhasServidor, espera })
    await esperar(espera, sinal)
  }
}
