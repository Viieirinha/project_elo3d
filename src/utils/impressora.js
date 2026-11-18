import { api } from './api.js'

// Rotas da integração com a impressora. O navegador NUNCA fala com a impressora: ele só lê o estado que o agente
// (no notebook) enviou ao servidor. O checkCode da impressora não passa por aqui.
export const getImpressoras = () => api('/impressoras')
export const criarImpressora = (dados) => api('/impressoras', { method: 'POST', body: dados }) // devolve { impressora, token }
export const atualizarImpressora = (id, dados) => api(`/impressoras/${id}`, { method: 'PUT', body: dados })
export const regenerarTokenAgente = (id) => api(`/impressoras/${id}/token`, { method: 'POST' }) // devolve { impressora, token }
export const removerImpressora = (id) => api(`/impressoras/${id}`, { method: 'DELETE' })
export const getEstadoImpressora = (id) => api(`/impressoras/${id}/estado`)

export const getJobs = (impressoraId) => api(`/impressao-jobs${impressoraId ? `?impressoraId=${impressoraId}` : ''}`)
export const atualizarJob = (id, dados) => api(`/impressao-jobs/${id}`, { method: 'PATCH', body: dados })
export const removerJob = (id) => api(`/impressao-jobs/${id}`, { method: 'DELETE' })

/** Só IPv4 de rede local (o servidor também valida; isto dá o aviso na hora, enquanto a pessoa digita). */
export function ipLocalValido(ip) {
  if (typeof ip !== 'string') return false
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number)
  if ([a, b, c, d].some((o) => o > 255)) return false
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127
}

/** Mensagem e orientação para cada tipo de falha que o agente reporta. */
export const MENSAGENS_ERRO_IMPRESSORA = {
  offline: 'A impressora não respondeu. Confira se está ligada, na mesma rede do notebook e se o IP cadastrado está correto (ele pode ter mudado).',
  credencial: 'Número de série ou checkCode incorretos. Confira o número de série aqui e atualize o checkCode no arquivo .env do notebook.',
  lan: 'O modo LAN está desativado na impressora (API local bloqueada). Ative o modo LAN no menu da impressora e reinicie-a.',
  firmware: 'A impressora respondeu de um jeito inesperado: o firmware pode ser incompatível. Rode "node src/index.js --diagnostico" no notebook.',
  servico: 'O agente teve um erro inesperado. Veja o arquivo agente.log no notebook.',
}

export const ESTADOS_IMPRESSORA = {
  ociosa: { rotulo: 'Ociosa', tom: 'neutro' },
  imprimindo: { rotulo: 'Imprimindo', tom: 'marca' },
  aquecendo: { rotulo: 'Aquecendo', tom: 'marca' },
  pausada: { rotulo: 'Pausada', tom: 'alerta' },
  erro: { rotulo: 'Erro', tom: 'perigo' },
  ocupada: { rotulo: 'Ocupada', tom: 'alerta' },
  concluida: { rotulo: 'Concluída', tom: 'sucesso' },
  cancelando: { rotulo: 'Cancelando', tom: 'alerta' },
  cancelada: { rotulo: 'Cancelada', tom: 'alerta' },
  desconhecido: { rotulo: 'Estado desconhecido', tom: 'alerta' },
}

export const RESULTADOS_JOB = {
  concluido: { rotulo: 'Concluído', tom: 'sucesso' },
  cancelado: { rotulo: 'Cancelado', tom: 'alerta' },
  erro: { rotulo: 'Erro', tom: 'perigo' },
  interrompido: { rotulo: 'Interrompido', tom: 'alerta' },
}
