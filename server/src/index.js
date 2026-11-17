import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, tx, camel } from './db.js'
import * as s from './services.js'

const { DATABASE_URL, JWT_SECRET, CODIGO_CONVITE } = process.env
const PORT = Number(process.env.PORT) || 3001
if (!DATABASE_URL || !JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('Defina DATABASE_URL e JWT_SECRET (mínimo 32 caracteres) no ambiente.')
  process.exit(1)
}

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '2mb' })) // fotos de produto vão como data URL

// Envolve handlers async e entrega erros ao middleware final.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const autor = (req) => req.user.nome || req.user.email

// ---------- limitador simples de tentativas de login ----------
const tentativas = new Map()
function limitarAuth(req, res, next) {
  const agora = Date.now()
  const janela = 15 * 60 * 1000
  const lista = (tentativas.get(req.ip) ?? []).filter((t) => agora - t < janela)
  if (lista.length >= 20) {
    return res.status(429).json({ code: 'auth/too-many-requests', message: 'Muitas tentativas.' })
  }
  lista.push(agora)
  tentativas.set(req.ip, lista)
  next()
}

// ---------- autenticação ----------
const emailValido = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const publico = (u) => ({ uid: u.id, email: u.email, displayName: u.nome })
const emitirToken = (u) => jwt.sign({ sub: u.id }, JWT_SECRET, { expiresIn: '30d' })

app.post('/api/auth/register', limitarAuth, h(async (req, res) => {
  const { email, senha, nome, codigoConvite } = req.body ?? {}
  if (!CODIGO_CONVITE) throw new s.HttpError(403, 'Cadastro desativado.', 'auth/signup-disabled')
  if (codigoConvite !== CODIGO_CONVITE) throw new s.HttpError(403, 'Código inválido.', 'auth/invalid-invite')
  if (!emailValido(email)) throw new s.HttpError(400, 'E-mail inválido.', 'auth/invalid-email')
  if (typeof senha !== 'string' || senha.length < 8) {
    throw new s.HttpError(400, 'Senha fraca.', 'auth/weak-password')
  }
  const hash = await bcrypt.hash(senha, 12)
  try {
    const r = await pool.query(
      'INSERT INTO usuarios (email, nome, senha_hash) VALUES ($1,$2,$3) RETURNING *',
      [email.trim(), (nome ?? '').trim() || null, hash]
    )
    const u = r.rows[0]
    res.status(201).json({ token: emitirToken(u), user: publico(u) })
  } catch (err) {
    if (err.code === '23505') throw new s.HttpError(409, 'E-mail já cadastrado.', 'auth/email-already-in-use')
    throw err
  }
}))

const HASH_FALSO = bcrypt.hashSync('nao-existe', 12)

app.post('/api/auth/login', limitarAuth, h(async (req, res) => {
  const { email, senha } = req.body ?? {}
  const r = await pool.query('SELECT * FROM usuarios WHERE lower(email) = lower($1)', [String(email ?? '').trim()])
  const u = r.rows[0]
  // compara sempre, mesmo sem usuário, para não revelar se o e-mail existe
  const ok = await bcrypt.compare(String(senha ?? ''), u?.senha_hash ?? HASH_FALSO)
  if (!u || !ok) throw new s.HttpError(401, 'Credenciais inválidas.', 'auth/invalid-credential')
  res.json({ token: emitirToken(u), user: publico(u) })
}))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Tudo abaixo exige token válido.
app.use('/api', h(async (req, res, next) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    s.validarId(sub)
    const r = await pool.query('SELECT * FROM usuarios WHERE id = $1', [sub])
    if (!r.rows[0]) throw new Error('usuário removido')
    req.user = camel(r.rows[0])
    next()
  } catch {
    res.status(401).json({ code: 'auth/unauthorized', message: 'Sessão expirada.' })
  }
}))

app.get('/api/auth/me', (req, res) => res.json({ user: publico({ ...req.user, id: req.user.id }) }))

// ---------- dados ----------
const q = (fn) => h(async (req, res) => res.json(await fn(pool, req)))
const t = (fn) => h(async (req, res) => res.json(await tx((c) => fn(c, req))))

app.get('/api/categorias', q((c) => s.getCategorias(c)))
app.post('/api/categorias', t((c, req) => s.adicionarCategoria(c, req.body?.nome)))
app.delete('/api/categorias/:nome', t((c, req) => s.removerCategoria(c, req.params.nome)))

app.get('/api/config/estoque-minimo', q(async (c) => ({ valor: await s.getEstoqueMinimo(c) })))
app.put('/api/config/estoque-minimo', t(async (c, req) => ({
  valor: await s.setEstoqueMinimo(c, s.numero(req.body?.valor, 'estoque mínimo', { inteiro: true })),
})))

// ?fotos=0 devolve a lista sem as imagens (muito mais leve) para telas que só precisam de nome/preço/estoque.
app.get('/api/produtos', q((c, req) => s.getProdutos(c, { comFoto: req.query.fotos !== '0' })))
app.post('/api/produtos', t((c, req) => s.registrarProduto(c, req.body ?? {}, autor(req))))
app.put('/api/produtos/:id', t((c, req) => s.atualizarProduto(c, req.params.id, req.body ?? {}, autor(req))))
app.delete('/api/produtos/:id', t((c, req) => s.removerProduto(c, req.params.id)))

app.get('/api/movimentacoes', q((c) => s.getMovimentacoes(c)))
app.post('/api/movimentacoes', t((c, req) => s.registrarMovimentacao(c, req.body ?? {}, autor(req))))
app.delete('/api/movimentacoes/:id', t((c, req) => s.removerMovimentacao(c, req.params.id)))

app.get('/api/vendas', q((c) => s.getVendas(c)))
app.post('/api/vendas', t((c, req) => s.registrarVenda(c, req.body ?? {}, autor(req))))
app.delete('/api/vendas/:id', t((c, req) => s.removerVenda(c, req.params.id, autor(req))))

app.get('/api/pedidos', q((c) => s.getPedidos(c)))
app.post('/api/pedidos', t((c, req) => s.registrarPedido(c, req.body ?? {}, autor(req))))
app.patch('/api/pedidos/:id/status', t((c, req) => s.atualizarStatusPedido(c, req.params.id, req.body?.status, autor(req))))
app.delete('/api/pedidos/:id', t((c, req) => s.removerPedido(c, req.params.id)))

// ---------- erros ----------
app.use('/api', (req, res) => res.status(404).json({ message: 'Rota não encontrada.' }))
app.use((err, req, res, next) => {
  if (err instanceof s.HttpError) return res.status(err.status).json({ code: err.code, message: err.message })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Imagem muito grande.' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' })
  console.error(err)
  res.status(500).json({ message: 'Erro interno.' })
})

const servidor = app.listen(PORT, '127.0.0.1', () => console.log(`API ELO 3D em 127.0.0.1:${PORT}`))

// Encerramento limpo (systemctl stop/restart): termina as requisições em andamento e fecha o banco.
function encerrar(sinal) {
  console.log(`${sinal} recebido, encerrando...`)
  servidor.close(async () => {
    await pool.end().catch(() => {})
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => encerrar('SIGTERM'))
process.on('SIGINT', () => encerrar('SIGINT'))
