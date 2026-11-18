// Rotas da integração com impressoras.
//  - Agente (notebook): autentica com o TOKEN do agente (não com o login do usuário).
//  - Usuário (tela): autentica com o login normal (JWT).
import * as svc from './servico.js'
import { validarSnapshot, validarFalha } from './validacao.js'
import { HttpError } from '../services.js'

// Limitador simples por chave (janela deslizante), em memória.
function limitador(max, janelaMs) {
  const mapa = new Map()
  return (chave) => {
    const agora = Date.now()
    const lista = (mapa.get(chave) ?? []).filter((t) => agora - t < janelaMs)
    if (lista.length >= max) return false
    lista.push(agora)
    mapa.set(chave, lista)
    return true
  }
}

/** Rotas do agente. Devem ser registradas ANTES do middleware de login do usuário. */
export function rotasAgente(app, { h, pool, tx }) {
  const permitido = limitador(60, 60_000) // o agente consulta a cada 7 a 30 s: 60/min é folga de sobra

  const autenticarAgente = h(async (req, res, next) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
    const impressora = await svc.resolverAgente(pool, token)
    if (!impressora) return res.status(401).json({ code: 'agente/token-invalido', message: 'Token do agente inválido.' })
    if (!permitido(impressora.id)) return res.status(429).json({ code: 'agente/limite', message: 'Muitas requisições.' })
    req.impressora = impressora
    next()
  })

  // IP/porta/série atuais: quem edita o IP na tela vale na próxima consulta do agente.
  app.get('/api/agente/config', autenticarAgente, h(async (req, res) => {
    res.json({ impressora: svc.configParaAgente(req.impressora), proximoIntervaloMs: 30_000 })
  }))

  app.post('/api/agente/estado', autenticarAgente, h(async (req, res) => {
    const { snapshot, falha } = req.body ?? {}
    if (!snapshot && !falha) throw new HttpError(400, 'Envie "snapshot" ou "falha".')
    const resultado = await tx((c) =>
      snapshot ? svc.registrarSnapshot(c, req.impressora.id, validarSnapshot(snapshot)) : svc.registrarFalha(c, req.impressora.id, validarFalha(falha))
    )
    // devolve a configuração atual para o agente aplicar sem precisar de outra chamada
    const atual = await svc.resolverAgente(pool, (req.headers.authorization ?? '').replace(/^Bearer /, ''))
    res.json({ ok: true, proximoIntervaloMs: resultado.proximoIntervaloMs, impressora: atual ? svc.configParaAgente(atual) : null })
  }))
}

/** Rotas da tela. Devem ser registradas DEPOIS do middleware de login do usuário. */
export function rotasUsuario(app, { q, t }) {
  app.get('/api/impressoras', q((c) => svc.listarImpressoras(c)))
  app.post('/api/impressoras', t((c, req) => svc.criarImpressora(c, req.body ?? {})))
  app.put('/api/impressoras/:id', t((c, req) => svc.atualizarImpressora(c, req.params.id, req.body ?? {})))
  app.post('/api/impressoras/:id/token', t((c, req) => svc.regenerarToken(c, req.params.id)))
  app.delete('/api/impressoras/:id', t(async (c, req) => {
    await svc.removerImpressora(c, req.params.id)
    return svc.listarImpressoras(c)
  }))
  app.get('/api/impressoras/:id/estado', t((c, req) => svc.obterEstado(c, req.params.id)))

  app.get('/api/impressao-jobs', q((c, req) => svc.listarJobs(c, { impressoraId: req.query.impressoraId, limite: req.query.limite })))
  app.patch('/api/impressao-jobs/:id', t((c, req) => svc.atualizarJob(c, req.params.id, req.body ?? {})))
  app.delete('/api/impressao-jobs/:id', t(async (c, req) => {
    await svc.removerJob(c, req.params.id)
    return svc.listarJobs(c, {})
  }))
}
