// Sessão do usuário: token de vida curta (expira por INATIVIDADE) com um limite MÁXIMO de duração.
//
//  - O token expira `inatividadeSeg` depois de emitido. Quem continua usando o sistema o renova (ver /api/auth/renovar);
//    quem para de usar tem a sessão encerrada e precisa entrar de novo.
//  - Mesmo com uso contínuo, a sessão nunca passa de `maximaSeg` desde o login: depois disso, novo login.
//  - A renovação é EXPLÍCITA: consultas automáticas (ex.: a tela da impressora a cada 7 s) não estendem a sessão.
//  - Tokens emitidos antes desta mudança (sem "sessaoInicio") são recusados: todos entram de novo uma vez.
//
// Lógica pura (relógio injetável) para ser testável sem servidor.
import jwt from 'jsonwebtoken'

export class ErroSessao extends Error {
  constructor(codigo, mensagem) {
    super(mensagem)
    this.name = 'ErroSessao'
    this.codigo = codigo
  }
}

export const MENSAGEM_EXPIRADA = 'Sessão expirada. Entre novamente.'

/** Lê as durações das variáveis de ambiente. Padrão: 60 min de inatividade e 12 h no máximo. */
export function lerConfigSessao(env = process.env) {
  const bruto = (v, padrao) => (v === undefined || String(v).trim() === '' ? padrao : Number(v))
  const inatividadeMin = bruto(env.SESSAO_INATIVIDADE_MIN, 60)
  const maximaHoras = bruto(env.SESSAO_MAXIMA_HORAS, 12)
  if (!Number.isFinite(inatividadeMin) || inatividadeMin <= 0 || inatividadeMin > 1440) {
    throw new Error('SESSAO_INATIVIDADE_MIN inválido: use um número de minutos maior que 0 e até 1440.')
  }
  if (!Number.isFinite(maximaHoras) || maximaHoras <= 0 || maximaHoras > 720) {
    throw new Error('SESSAO_MAXIMA_HORAS inválido: use um número de horas maior que 0 e até 720.')
  }
  if (inatividadeMin * 60 > maximaHoras * 3600) {
    throw new Error('SESSAO_INATIVIDADE_MIN não pode ser maior que SESSAO_MAXIMA_HORAS.')
  }
  return { inatividadeSeg: Math.round(inatividadeMin * 60), maximaSeg: Math.round(maximaHoras * 3600) }
}

const noSegundos = () => Math.floor(Date.now() / 1000)

export function criarSessao({ segredo, inatividadeSeg, maximaSeg, agora = noSegundos }) {
  /**
   * Emite um token. `inicio` é o instante do login original (preservado nas renovações). `versaoSenha` identifica a
   * senha vigente (instante da última troca, ou 0): trocar a senha invalida todos os tokens anteriores, sem depender
   * de comparar horários (que falharia para trocas no mesmo segundo da emissão).
   */
  function emitir(usuarioId, inicio = agora(), versaoSenha = 0) {
    const exp = Math.min(agora() + inatividadeSeg, inicio + maximaSeg)
    if (exp <= agora()) throw new ErroSessao('auth/sessao-expirada', MENSAGEM_EXPIRADA)
    const token = jwt.sign({ sub: usuarioId, sessaoInicio: inicio, idle: inatividadeSeg, pv: versaoSenha, exp }, segredo)
    return { token, exp, expiraEm: new Date(exp * 1000).toISOString() }
  }

  /** Valida o token. Lança ErroSessao com o código certo (expirada x inválida). */
  function verificar(token) {
    let dados
    try {
      dados = jwt.verify(token, segredo, { clockTimestamp: agora() })
    } catch (e) {
      if (e?.name === 'TokenExpiredError') throw new ErroSessao('auth/sessao-expirada', MENSAGEM_EXPIRADA)
      throw new ErroSessao('auth/unauthorized', 'Sessão inválida.')
    }
    // Token antigo (sem início de sessão) ou além do limite máximo: expirado.
    if (typeof dados.sessaoInicio !== 'number' || typeof dados.exp !== 'number' || agora() >= dados.sessaoInicio + maximaSeg) {
      throw new ErroSessao('auth/sessao-expirada', MENSAGEM_EXPIRADA)
    }
    return { sub: dados.sub, iat: dados.iat, exp: dados.exp, inicio: dados.sessaoInicio, versaoSenha: typeof dados.pv === 'number' ? dados.pv : 0 }
  }

  /** Renova uma sessão válida por mais um período de inatividade, sem ultrapassar o limite máximo. */
  const renovar = (dados) => emitir(dados.sub, dados.inicio, dados.versaoSenha)

  return { emitir, verificar, renovar, inatividadeSeg, maximaSeg }
}
