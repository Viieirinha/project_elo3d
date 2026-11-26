// Regras da sessão no navegador (funções puras, sem React, para serem testáveis).
//
// O servidor emite um token que expira por INATIVIDADE e é renovado enquanto o usuário usa o sistema; há também
// um limite máximo de duração. O navegador só lê as datas do token (o servidor é quem as valida) para saber
// quando renovar e quando pedir um novo login sem esperar uma resposta 401.

const decodificar = (parte) => JSON.parse(decodeURIComponent(escape(atob(parte.replace(/-/g, '+').replace(/_/g, '/')))))

/** Lê início, expiração e janela de inatividade do token (em milissegundos). Devolve null se o token for ilegível. */
export function lerSessao(token) {
  try {
    const dados = decodificar(String(token).split('.')[1])
    if (typeof dados.exp !== 'number') return null
    return { exp: dados.exp * 1000, inicio: (dados.sessaoInicio ?? dados.iat ?? 0) * 1000, idleMs: (dados.idle ?? 3600) * 1000 }
  } catch {
    return null
  }
}

export const expirou = (agora, exp) => agora >= exp

/**
 * Renova só quando: (1) o usuário FEZ algo desde a última renovação, (2) já passou 1/3 da janela de inatividade e
 * (3) não renovou há pouco. Assim, consultas automáticas e abas esquecidas abertas não mantêm a sessão viva.
 */
export function deveRenovar({ agora, exp, idleMs, ultimaAtividade, ultimaRenovacao }) {
  const restante = exp - agora
  return restante > 0 && ultimaAtividade > ultimaRenovacao && restante < (idleMs * 2) / 3 && agora - ultimaRenovacao > idleMs / 6
}

/** Intervalo de verificação: 1/6 da janela, entre 1 s e 10 s. */
export const intervaloDeVerificacao = (idleMs) => Math.min(10_000, Math.max(1_000, Math.round(idleMs / 6)))

export const MENSAGENS_AVISO_SAIDA = {
  expirada: 'Sua sessão expirou. Entre novamente para continuar.',
  'senha-alterada': 'Sua senha foi alterada. Entre novamente.',
}
