import { camel, camelAll } from './db.js'

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validarId(id) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new HttpError(400, 'Identificador inválido.')
  return id
}

export function numero(valor, campo, { min = 0, inteiro = false } = {}) {
  const n = typeof valor === 'number' ? valor : parseFloat(valor)
  if (!Number.isFinite(n) || n < min || (inteiro && !Number.isInteger(n))) {
    throw new HttpError(400, `Valor inválido para ${campo}.`)
  }
  return n
}

// ---------- categorias ----------
export async function getCategorias(c) {
  const r = await c.query('SELECT nome FROM categorias ORDER BY lower(nome)')
  return r.rows.map((x) => x.nome)
}

export async function adicionarCategoria(c, nome) {
  const normalizado = nome?.trim()
  if (normalizado) {
    await c.query('INSERT INTO categorias (nome) VALUES ($1) ON CONFLICT DO NOTHING', [normalizado])
  }
  return getCategorias(c)
}

export async function removerCategoria(c, nome) {
  await c.query('DELETE FROM categorias WHERE lower(nome) = lower($1)', [nome])
  return getCategorias(c)
}

// ---------- config ----------
export async function getEstoqueMinimo(c) {
  const r = await c.query("SELECT valor FROM config WHERE chave = 'estoqueMinimo'")
  return typeof r.rows[0]?.valor === 'number' ? r.rows[0].valor : 5
}

export async function setEstoqueMinimo(c, valor) {
  await c.query(
    `INSERT INTO config (chave, valor) VALUES ('estoqueMinimo', $1::jsonb)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [JSON.stringify(valor)]
  )
  return valor
}

// ---------- produtos / estoque ----------
export async function getProdutos(c) {
  return camelAll(await c.query('SELECT * FROM produtos ORDER BY criado_em'))
}

export async function getMovimentacoes(c) {
  return camelAll(await c.query('SELECT * FROM movimentacoes ORDER BY criado_em DESC'))
}

export async function registrarMovimentacao(c, { produtoId, tipo, quantidade, motivo }, autor) {
  if (!['entrada', 'saida'].includes(tipo)) throw new HttpError(400, 'Tipo de movimentação inválido.')
  const qtd = numero(quantidade, 'quantidade', { min: 1, inteiro: true })
  validarId(produtoId)

  const r = await c.query('SELECT * FROM produtos WHERE id = $1 FOR UPDATE', [produtoId])
  const produto = r.rows[0]
  if (produto) {
    const delta = tipo === 'entrada' ? qtd : -qtd
    await c.query(
      `UPDATE produtos SET quantidade = GREATEST(0, quantidade + $2),
         atualizado_em = now(), atualizado_por = $3 WHERE id = $1`,
      [produtoId, delta, autor]
    )
  }

  await c.query(
    `INSERT INTO movimentacoes (produto_id, produto_nome, tipo, quantidade, motivo, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      produtoId,
      produto?.nome ?? '(produto removido)',
      tipo,
      qtd,
      motivo || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
      autor,
    ]
  )

  return { produtos: await getProdutos(c), movimentacoes: await getMovimentacoes(c) }
}

export async function registrarProduto(c, dados, autor) {
  const nome = String(dados.nome ?? '').trim()
  if (!nome) throw new HttpError(400, 'Informe o nome do produto.')
  const quantidade = numero(dados.quantidade, 'quantidade', { min: 1, inteiro: true })
  const custo = numero(dados.custoUnitario, 'custo unitário')
  const preco = numero(dados.precoVenda, 'preço de venda')
  const categoria = dados.categoria?.trim() || ''
  const foto = dados.foto || null

  const existente = (
    await c.query('SELECT id FROM produtos WHERE lower(btrim(nome)) = lower($1) FOR UPDATE', [nome])
  ).rows[0]

  let produtoId
  if (existente) {
    await c.query(
      `UPDATE produtos SET custo_unitario = $2, preco_venda = $3,
         categoria = CASE WHEN $4 <> '' THEN $4 ELSE categoria END,
         foto = COALESCE($5, foto), atualizado_em = now(), atualizado_por = $6
       WHERE id = $1`,
      [existente.id, custo, preco, categoria, foto, autor]
    )
    produtoId = existente.id
  } else {
    const ins = await c.query(
      `INSERT INTO produtos (nome, categoria, quantidade, foto, custo_unitario, preco_venda, criado_por)
       VALUES ($1, $2, 0, $3, $4, $5, $6) RETURNING id`,
      [nome, categoria, foto, custo, preco, autor]
    )
    produtoId = ins.rows[0].id
  }

  if (categoria) await adicionarCategoria(c, categoria)

  const { produtos } = await registrarMovimentacao(
    c,
    { produtoId, tipo: 'entrada', quantidade, motivo: existente ? 'Produção adicionada' : 'Cadastro inicial' },
    autor
  )
  return produtos
}

export async function atualizarProduto(c, id, dados, autor) {
  validarId(id)
  const nome = String(dados.nome ?? '').trim()
  if (!nome) throw new HttpError(400, 'Informe o nome do produto.')
  const custo = numero(dados.custoUnitario, 'custo unitário')
  const preco = numero(dados.precoVenda, 'preço de venda')

  const sets = ['nome = $2', 'custo_unitario = $3', 'preco_venda = $4', 'atualizado_em = now()', 'atualizado_por = $5']
  const params = [id, nome, custo, preco, autor]
  if (dados.foto !== undefined) {
    params.push(dados.foto)
    sets.push(`foto = $${params.length}`)
  }
  if (dados.categoria !== undefined) {
    const categoria = String(dados.categoria).trim()
    params.push(categoria)
    sets.push(`categoria = $${params.length}`)
    if (categoria) await adicionarCategoria(c, categoria)
  }
  await c.query(`UPDATE produtos SET ${sets.join(', ')} WHERE id = $1`, params)
  return getProdutos(c)
}

export async function removerProduto(c, id) {
  validarId(id)
  await c.query('DELETE FROM produtos WHERE id = $1', [id])
  return getProdutos(c)
}

export async function removerMovimentacao(c, id) {
  validarId(id)
  await c.query('DELETE FROM movimentacoes WHERE id = $1', [id])
  return getMovimentacoes(c)
}

// ---------- vendas ----------
export async function getVendas(c) {
  return camelAll(await c.query('SELECT * FROM vendas ORDER BY criado_em DESC'))
}

async function inserirVenda(c, { produtoId, quantidade, valorUnitario }, autor) {
  validarId(produtoId)
  const qtd = numero(quantidade, 'quantidade', { min: 1, inteiro: true })
  const valor = numero(valorUnitario, 'valor unitário')

  const produto = (await c.query('SELECT * FROM produtos WHERE id = $1', [produtoId])).rows[0]
  if (!produto) throw new HttpError(404, 'Produto não encontrado.')

  const custoUnitario = produto.custo_unitario ?? 0
  const valorTotal = qtd * valor
  const custoTotal = qtd * custoUnitario

  await c.query(
    `INSERT INTO vendas (produto_id, produto_nome, quantidade, valor_unitario, valor_total,
       custo_unitario, custo_total, lucro, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [produtoId, produto.nome, qtd, valor, valorTotal, custoUnitario, custoTotal, valorTotal - custoTotal, autor]
  )
  await registrarMovimentacao(c, { produtoId, tipo: 'saida', quantidade: qtd, motivo: 'Venda' }, autor)
}

export async function registrarVenda(c, dados, autor) {
  await inserirVenda(c, dados, autor)
  return getVendas(c)
}

export async function removerVenda(c, id, autor) {
  validarId(id)
  const venda = (await c.query('SELECT * FROM vendas WHERE id = $1 FOR UPDATE', [id])).rows[0]
  if (venda) {
    if (venda.produto_id) {
      await registrarMovimentacao(
        c,
        { produtoId: venda.produto_id, tipo: 'entrada', quantidade: venda.quantidade, motivo: 'Estorno de venda' },
        autor
      )
    }
    await c.query('DELETE FROM vendas WHERE id = $1', [id])
  }
  return getVendas(c)
}

// ---------- pedidos ----------
export const STATUS_PEDIDO = ['pedido', 'producao', 'pronto', 'entregue', 'cancelado']

export async function getPedidos(c) {
  return camelAll(await c.query('SELECT * FROM pedidos ORDER BY criado_em DESC'))
}

export async function registrarPedido(c, dados, autor) {
  const cliente = String(dados.cliente ?? '').trim()
  if (!cliente) throw new HttpError(400, 'Informe o cliente.')
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) throw new HttpError(400, 'Adicione ao menos um item.')

  const itens = dados.itens.map((i) => ({
    produtoId: i.produtoId ? validarId(i.produtoId) : '',
    produtoNome: String(i.produtoNome ?? ''),
    quantidade: numero(i.quantidade, 'quantidade', { min: 1, inteiro: true }),
    valorUnitario: numero(i.valorUnitario, 'valor unitário'),
  }))
  const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0)

  await c.query(
    `INSERT INTO pedidos (cliente, contato, itens, valor_total, data_prevista, observacoes, criado_por)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)`,
    [
      cliente,
      dados.contato?.trim() || '',
      JSON.stringify(itens),
      valorTotal,
      dados.dataPrevista || null,
      dados.observacoes?.trim() || '',
      autor,
    ]
  )
  return getPedidos(c)
}

export async function atualizarStatusPedido(c, id, novoStatus, autor) {
  validarId(id)
  if (!STATUS_PEDIDO.includes(novoStatus)) throw new HttpError(400, 'Status inválido.')

  const pedido = (await c.query('SELECT * FROM pedidos WHERE id = $1 FOR UPDATE', [id])).rows[0]
  if (!pedido) return getPedidos(c)

  // Tudo na mesma transação: se uma venda falhar, o status não muda e nada é duplicado.
  if (novoStatus === 'entregue' && pedido.status !== 'entregue') {
    for (const item of pedido.itens) {
      if (item.produtoId) await inserirVenda(c, item, autor)
    }
  }

  await c.query(
    `UPDATE pedidos SET status = $2, atualizado_em = now(), atualizado_por = $3,
       entregue_em = CASE WHEN $2 = 'entregue' THEN now() ELSE entregue_em END
     WHERE id = $1`,
    [id, novoStatus, autor]
  )
  return getPedidos(c)
}

export async function removerPedido(c, id) {
  validarId(id)
  await c.query('DELETE FROM pedidos WHERE id = $1', [id])
  return getPedidos(c)
}

export { camel }
