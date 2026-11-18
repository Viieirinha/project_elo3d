// Validação de tudo que chega do agente. O agente roda fora do servidor, então nada é confiado: os campos são
// verificados, limitados em tamanho e reduzidos à lista conhecida (campos extras são descartados).
import { createHash, randomBytes } from 'node:crypto'
import { HttpError } from '../services.js'

export const ESTADOS = ['ociosa', 'imprimindo', 'aquecendo', 'pausada', 'erro', 'ocupada', 'concluida', 'cancelando', 'cancelada', 'desconhecido']
export const CODIGOS_FALHA = ['offline', 'credencial', 'lan', 'firmware', 'servico']

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const inteiro = (v) => (num(v) === null ? null : Math.round(v))
const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null)
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function temperatura(v) {
  if (!objeto(v)) return null
  const atual = num(v.atual)
  const alvo = num(v.alvo)
  return atual === null && alvo === null ? null : { atual, alvo }
}

function filamento(v) {
  if (!objeto(v)) return null
  const ferramentas = (Array.isArray(v.ferramentas) ? v.ferramentas : []).slice(0, 8).filter(objeto).map((f) => ({
    ferramenta: inteiro(f.ferramenta),
    material: texto(f.material, 40),
    cor: typeof f.cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(f.cor) ? f.cor : null,
    gramas: num(f.gramas) !== null && f.gramas >= 0 ? f.gramas : null,
    slot: inteiro(f.slot),
  }))
  const gramas = num(v.gramasEstimadas)
  if (gramas === null && ferramentas.length === 0) return null
  return { gramasEstimadas: gramas !== null && gramas >= 0 ? gramas : null, ferramentas }
}

/** Valida e normaliza um snapshot de estado enviado pelo agente. Lança HttpError(400) se o essencial faltar. */
export function validarSnapshot(entrada, agora = new Date()) {
  if (!objeto(entrada)) throw new HttpError(400, 'Estado inválido.')
  if (!ESTADOS.includes(entrada.estado)) throw new HttpError(400, 'Estado desconhecido.')
  const medidoEm = new Date(entrada.medidoEm)
  if (Number.isNaN(medidoEm.getTime())) throw new HttpError(400, 'Data da medição inválida.')
  if (medidoEm.getTime() > agora.getTime() + 10 * 60_000) throw new HttpError(400, 'Data da medição no futuro.')

  const progresso = num(entrada.progresso)
  const t = objeto(entrada.temperaturas) ? entrada.temperaturas : {}
  return {
    estado: entrada.estado,
    estadoBruto: texto(entrada.estadoBruto, 40),
    arquivo: texto(entrada.arquivo, 300) || null,
    progresso: progresso === null ? null : Math.min(1, Math.max(0, progresso)),
    camadaAtual: inteiro(entrada.camadaAtual),
    camadaTotal: inteiro(entrada.camadaTotal),
    decorridoSeg: num(entrada.decorridoSeg) !== null && entrada.decorridoSeg >= 0 ? Math.round(entrada.decorridoSeg) : null,
    restanteSeg: num(entrada.restanteSeg) !== null && entrada.restanteSeg >= 0 ? Math.round(entrada.restanteSeg) : null,
    temperaturas: {
      bico: temperatura(t.bico),
      bicoDireito: temperatura(t.bicoDireito),
      mesa: temperatura(t.mesa),
      camara: temperatura(t.camara),
    },
    codigoErro: texto(entrada.codigoErro, 40) || null,
    filamento: filamento(entrada.filamento),
    medidoEm: medidoEm.toISOString(),
  }
}

/** Valida uma falha de comunicação enviada pelo agente (impressora offline, credencial errada...). */
export function validarFalha(entrada) {
  if (!objeto(entrada)) throw new HttpError(400, 'Falha inválida.')
  return {
    codigo: CODIGOS_FALHA.includes(entrada.codigo) ? entrada.codigo : 'servico',
    mensagem: texto(entrada.mensagem, 300) || '',
  }
}

/**
 * Aceita só IPv4 de rede local (10.x, 172.16-31.x, 192.168.x, 169.254.x e 127.x). A impressora fica na rede
 * doméstica; recusar endereços públicos evita que o cadastro aponte o agente para fora da rede.
 */
export function ipLocalValido(ip) {
  if (typeof ip !== 'string') return false
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number)
  if ([a, b, c, d].some((o) => o > 255)) return false
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127
}

// ---- token do agente: aleatório, mostrado uma única vez; só o hash fica no banco ----
export const gerarToken = () => `elo3d_ag_${randomBytes(32).toString('base64url')}`
export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')
