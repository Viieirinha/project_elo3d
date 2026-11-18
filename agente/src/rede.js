// Utilidades de rede: validação de IP local, espera com cancelamento e recuo exponencial (backoff).

/** Só IPv4 de rede local. O agente nunca deve enviar o checkCode para fora da rede doméstica. */
export function ipLocalValido(ip) {
  if (typeof ip !== 'string') return false
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number)
  if ([a, b, c, d].some((o) => o > 255)) return false
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127
}

/**
 * Tempo de espera após `falhas` falhas seguidas: 5 s, 10 s, 20 s, 40 s e depois 60 s (teto), com 10% de variação
 * para não sincronizar tentativas. `aleatorio` recebe um valor de 0 a 1 (injetável nos testes).
 */
export function recuoMs(falhas, aleatorio = Math.random) {
  if (falhas <= 0) return 0
  const base = Math.min(60_000, 5_000 * 2 ** (falhas - 1))
  return Math.round(base * (0.9 + aleatorio() * 0.2))
}

/** Espera `ms`, mas acorda na hora se o sinal for cancelado (para encerrar o agente sem demora). */
export function esperar(ms, sinal) {
  return new Promise((resolve) => {
    if (sinal?.aborted) return resolve()
    const t = setTimeout(done, ms)
    function done() {
      clearTimeout(t)
      sinal?.removeEventListener('abort', done)
      resolve()
    }
    sinal?.addEventListener('abort', done, { once: true })
  })
}
