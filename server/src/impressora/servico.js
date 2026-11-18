// Acesso ao banco para impressoras, estado ao vivo e histórico de jobs.
import { camelAll, camel } from '../db.js'
import { HttpError, validarId, numero } from '../services.js'
import { processarSnapshot } from './jobs.js'
import { gerarToken, hashToken, ipLocalValido } from './validacao.js'

export const PROVIDERS = ['flashforge'] // novos providers (ex.: 'moonraker') entram aqui e em agente/src/providers
const AGENTE_ONLINE_SEG = 90
const INTERVALO_RAPIDO_MS = 7_000 // há job em andamento ou alguém olhando a tela
const INTERVALO_LENTO_MS = 30_000 // ocioso e ninguém olhando: só para perceber o início de um job

const COLUNAS_IMPRESSORA = `i.id, i.nome, i.provider, i.ip, i.porta, i.numero_serie, i.ativa, i.criado_em,
  (i.token_hash IS NOT NULL) AS tem_token, e.recebido_em,
  COALESCE(e.recebido_em > now() - interval '${AGENTE_ONLINE_SEG} seconds', false) AS agente_online`
// token_hash nunca é selecionado em consultas que voltam para a interface.

function lerImpressora(dados, { parcial = false } = {}) {
  const saida = {}
  const quer = (campo) => !parcial || dados[campo] !== undefined

  if (quer('nome')) {
    const nome = String(dados.nome ?? '').trim()
    if (!nome || nome.length > 80) throw new HttpError(400, 'Informe um nome de até 80 caracteres.')
    saida.nome = nome
  }
  if (quer('ip')) {
    const ip = String(dados.ip ?? '').trim()
    if (!ipLocalValido(ip)) throw new HttpError(400, 'Informe um IP da rede local (ex.: 192.168.0.50).', 'impressora/ip-invalido')
    saida.ip = ip
  }
  if (quer('porta')) saida.porta = dados.porta === undefined || dados.porta === '' ? 8898 : numero(dados.porta, 'porta', { min: 1, inteiro: true })
  if (saida.porta > 65535) throw new HttpError(400, 'Porta inválida.')
  if (quer('numeroSerie')) {
    const serie = String(dados.numeroSerie ?? '').trim()
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(serie)) throw new HttpError(400, 'Número de série inválido (use letras, números, - e _).')
    saida.numeroSerie = serie
  }
  if (quer('provider') && dados.provider !== undefined) {
    if (!PROVIDERS.includes(dados.provider)) throw new HttpError(400, 'Modelo de impressora não suportado.')
    saida.provider = dados.provider
  }
  if (dados.ativa !== undefined) saida.ativa = Boolean(dados.ativa)
  return saida
}

// ---------- cadastro ----------
export async function listarImpressoras(c) {
  return camelAll(await c.query(`SELECT ${COLUNAS_IMPRESSORA} FROM impressoras i LEFT JOIN impressora_estado e ON e.impressora_id = i.id ORDER BY i.criado_em`))
}

async function obterImpressora(c, id) {
  validarId(id)
  const r = await c.query(`SELECT ${COLUNAS_IMPRESSORA} FROM impressoras i LEFT JOIN impressora_estado e ON e.impressora_id = i.id WHERE i.id = $1`, [id])
  if (!r.rows[0]) throw new HttpError(404, 'Impressora não encontrada.')
  return camel(r.rows[0])
}

/** Cria a impressora e devolve o token do agente (mostrado UMA vez; só o hash fica no banco). */
export async function criarImpressora(c, dados) {
  const d = lerImpressora({ provider: 'flashforge', ...dados })
  const token = gerarToken()
  const r = await c.query(
    `INSERT INTO impressoras (nome, provider, ip, porta, numero_serie, token_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [d.nome, d.provider, d.ip, d.porta, d.numeroSerie, hashToken(token)]
  )
  await c.query('INSERT INTO impressora_estado (impressora_id) VALUES ($1)', [r.rows[0].id])
  return { impressora: await obterImpressora(c, r.rows[0].id), token }
}

export async function atualizarImpressora(c, id, dados) {
  validarId(id)
  const d = lerImpressora(dados, { parcial: true })
  const mapa = { nome: 'nome', ip: 'ip', porta: 'porta', numeroSerie: 'numero_serie', provider: 'provider', ativa: 'ativa' }
  const sets = []
  const params = [id]
  for (const [chave, coluna] of Object.entries(mapa)) {
    if (d[chave] !== undefined) {
      params.push(d[chave])
      sets.push(`${coluna} = $${params.length}`)
    }
  }
  if (sets.length) await c.query(`UPDATE impressoras SET ${sets.join(', ')}, atualizado_em = now() WHERE id = $1`, params)
  return obterImpressora(c, id)
}

export async function regenerarToken(c, id) {
  validarId(id)
  const token = gerarToken()
  const r = await c.query('UPDATE impressoras SET token_hash = $2, atualizado_em = now() WHERE id = $1 RETURNING id', [id, hashToken(token)])
  if (!r.rows[0]) throw new HttpError(404, 'Impressora não encontrada.')
  return { impressora: await obterImpressora(c, id), token }
}

export async function removerImpressora(c, id) {
  validarId(id)
  await c.query('DELETE FROM impressoras WHERE id = $1', [id])
}

// ---------- agente ----------
/** Identifica a impressora pelo token do agente (compara o hash). */
export async function resolverAgente(c, token) {
  if (typeof token !== 'string' || !token.startsWith('elo3d_ag_') || token.length > 200) return null
  const r = await c.query('SELECT id, provider, ip, porta, numero_serie, ativa FROM impressoras WHERE token_hash = $1', [hashToken(token)])
  return camel(r.rows[0]) ?? null
}

export const configParaAgente = (i) => ({ id: i.id, provider: i.provider, ip: i.ip, porta: i.porta, numeroSerie: i.numeroSerie, ativa: i.ativa })

async function travarEstado(c, impressoraId) {
  await c.query('INSERT INTO impressora_estado (impressora_id) VALUES ($1) ON CONFLICT DO NOTHING', [impressoraId])
  // FOR UPDATE: duas consultas simultâneas do agente nunca processam o mesmo job ao mesmo tempo.
  return (await c.query('SELECT job_atual, ui_visto_em FROM impressora_estado WHERE impressora_id = $1 FOR UPDATE', [impressoraId])).rows[0]
}

function intervaloSugerido(jobAtual, uiVistoEm, agora = new Date()) {
  const alguemOlhando = uiVistoEm && agora.getTime() - new Date(uiVistoEm).getTime() < 90_000
  return jobAtual || alguemOlhando ? INTERVALO_RAPIDO_MS : INTERVALO_LENTO_MS
}

/** Recebe um snapshot do agente: guarda o estado e registra os jobs que terminaram (idempotente). */
export async function registrarSnapshot(c, impressoraId, snapshot) {
  const estado = await travarEstado(c, impressoraId)
  const { jobAtual, finalizados } = processarSnapshot(estado.job_atual ?? null, snapshot)

  let registrados = 0
  for (const j of finalizados) {
    const r = await c.query(
      `INSERT INTO impressao_jobs (impressora_id, chave_job, arquivo, iniciado_em, inicio_estimado, concluido_em,
         duracao_segundos, resultado, camada_total, gramas_estimadas, materiais)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (impressora_id, chave_job) DO NOTHING RETURNING id`,
      [impressoraId, j.chave, j.arquivo, j.iniciadoEm, j.inicioEstimado, j.concluidoEm, j.duracaoSegundos, j.resultado, j.camadaTotal, j.gramasEstimadas, j.materiais ? JSON.stringify(j.materiais) : null]
    )
    registrados += r.rowCount
  }

  await c.query(
    `UPDATE impressora_estado SET snapshot = $2::jsonb, recebido_em = now(), erro_codigo = NULL, erro_mensagem = NULL, job_atual = $3::jsonb
     WHERE impressora_id = $1`,
    [impressoraId, JSON.stringify(snapshot), jobAtual ? JSON.stringify(jobAtual) : null]
  )
  return { registrados, proximoIntervaloMs: intervaloSugerido(jobAtual, estado.ui_visto_em) }
}

/** Recebe uma falha de comunicação do agente (offline, credencial, LAN...). Mantém o último estado e o job aberto. */
export async function registrarFalha(c, impressoraId, falha) {
  const estado = await travarEstado(c, impressoraId)
  await c.query('UPDATE impressora_estado SET recebido_em = now(), erro_codigo = $2, erro_mensagem = $3 WHERE impressora_id = $1', [impressoraId, falha.codigo, falha.mensagem])
  return { proximoIntervaloMs: intervaloSugerido(estado.job_atual, estado.ui_visto_em) }
}

// ---------- tela ----------
/** Estado para a tela. Também registra que alguém está olhando (o agente passa a consultar mais rápido). */
export async function obterEstado(c, id) {
  const impressora = await obterImpressora(c, id)
  await c.query('UPDATE impressora_estado SET ui_visto_em = now() WHERE impressora_id = $1', [id])
  const e = (await c.query('SELECT snapshot, recebido_em, erro_codigo, erro_mensagem, job_atual FROM impressora_estado WHERE impressora_id = $1', [id])).rows[0] ?? {}
  const job = e.job_atual
  return {
    impressora,
    snapshot: e.snapshot ?? null,
    recebidoEm: e.recebido_em ?? null,
    agenteOnline: impressora.agenteOnline,
    erro: e.erro_codigo ? { codigo: e.erro_codigo, mensagem: e.erro_mensagem } : null,
    jobAtual: job
      ? { arquivo: job.arquivo, iniciadoEm: job.iniciadoEm, inicioEstimado: job.inicioEstimado, decorridoSeg: job.ultimoDecorridoSeg, progresso: job.ultimoProgresso }
      : null,
  }
}

// ---------- histórico de jobs ----------
export async function listarJobs(c, { impressoraId, limite = 50 } = {}) {
  const params = []
  let onde = ''
  if (impressoraId) {
    params.push(validarId(impressoraId))
    onde = 'WHERE impressora_id = $1'
  }
  params.push(Math.min(200, Math.max(1, Math.round(Number(limite) || 50))))
  return camelAll(await c.query(`SELECT * FROM impressao_jobs ${onde} ORDER BY concluido_em DESC LIMIT $${params.length}`, params))
}

export async function atualizarJob(c, id, dados) {
  validarId(id)
  const sets = []
  const params = [id]
  if (dados.produtoId !== undefined) {
    params.push(dados.produtoId === null || dados.produtoId === '' ? null : validarId(dados.produtoId))
    sets.push(`produto_id = $${params.length}`)
  }
  if (dados.observacoes !== undefined) {
    params.push(String(dados.observacoes).trim().slice(0, 500))
    sets.push(`observacoes = $${params.length}`)
  }
  if (!sets.length) throw new HttpError(400, 'Nada para atualizar.')
  const r = await c.query(`UPDATE impressao_jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params)
  if (!r.rows[0]) throw new HttpError(404, 'Job não encontrado.')
  return camel(r.rows[0])
}

export async function removerJob(c, id) {
  validarId(id)
  await c.query('DELETE FROM impressao_jobs WHERE id = $1', [id])
}
