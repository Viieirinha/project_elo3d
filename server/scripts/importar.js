// Importa o dump gerado por exportar-firebase.js para o PostgreSQL.
//
//   node scripts/importar.js dump.json --simular   # só valida e mostra o resumo
//   node scripts/importar.js dump.json             # importa (banco precisa estar vazio)
//   node scripts/importar.js dump.json --limpar    # apaga dados atuais (não os usuários) e importa
//
// Tudo roda em UMA transação: se algo falhar, nada é gravado.
// Precisa de DATABASE_URL (use o de /etc/elo3d/api.env no VPS).
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const [arquivo, ...flags] = process.argv.slice(2)
if (!arquivo) {
  console.error('Uso: node scripts/importar.js dump.json [--simular] [--limpar]')
  process.exit(1)
}
const simular = flags.includes('--simular')
const limpar = flags.includes('--limpar')
const dump = JSON.parse(readFileSync(arquivo, 'utf8'))
const avisos = []
const aviso = (m) => avisos.push(m)

const lista = (k) => (Array.isArray(dump[k]) ? dump[k] : [])
const num = (v, padrao = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : padrao)
const inteiro = (v) => Math.max(0, Math.round(num(v)))
const data = (v) => (v && !Number.isNaN(Date.parse(v)) ? v : null)

// ---------- monta as linhas já convertidas (sem tocar no banco) ----------
const idNovo = new Map() // id antigo do Firestore -> uuid
const nomesUsados = new Set()

const produtos = lista('produtos').map((p) => {
  let nome = String(p.nome ?? '').trim() || '(sem nome)'
  let chave = nome.toLowerCase()
  for (let n = 2; nomesUsados.has(chave); n++) {
    nome = `${String(p.nome).trim()} (${n})`
    chave = nome.toLowerCase()
    if (n === 2) aviso(`Produto duplicado "${String(p.nome).trim()}" renomeado para "${nome}".`)
  }
  nomesUsados.add(chave)
  const id = randomUUID()
  idNovo.set(p.id, id)
  return {
    id,
    nome,
    categoria: String(p.categoria ?? '').trim(),
    quantidade: inteiro(p.quantidade),
    foto: p.foto || null,
    custo: num(p.custoUnitario),
    preco: num(p.precoVenda),
    criadoEm: data(p.criadoEm),
    criadoPor: p.criadoPor ?? null,
    atualizadoEm: data(p.atualizadoEm),
    atualizadoPor: p.atualizadoPor ?? null,
  }
})

const resolverProduto = (antigo, contexto) => {
  if (!antigo) return null
  if (idNovo.has(antigo)) return idNovo.get(antigo)
  aviso(`${contexto}: produto ${antigo} não existe mais; vínculo removido (o nome é mantido).`)
  return null
}

const movimentacoes = lista('movimentacoes').flatMap((m, i) => {
  if (!['entrada', 'saida'].includes(m.tipo)) {
    aviso(`Movimentação ${m.id}: tipo "${m.tipo}" inválido; ignorada.`)
    return []
  }
  return [{
    produtoId: resolverProduto(m.produtoId, `Movimentação ${m.id}`),
    produtoNome: m.produtoNome ?? '(produto removido)',
    tipo: m.tipo,
    quantidade: inteiro(m.quantidade),
    motivo: m.motivo || (m.tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
    criadoEm: data(m.criadoEm),
    registradoPor: m.registradoPor ?? null,
  }]
})

const vendas = lista('vendas').map((v) => {
  const quantidade = inteiro(v.quantidade)
  const valorUnitario = num(v.valorUnitario)
  const custoUnitario = num(v.custoUnitario)
  const valorTotal = num(v.valorTotal, quantidade * valorUnitario)
  const custoTotal = num(v.custoTotal, quantidade * custoUnitario)
  return {
    produtoId: resolverProduto(v.produtoId, `Venda ${v.id}`),
    produtoNome: v.produtoNome ?? '(produto removido)',
    quantidade,
    valorUnitario,
    valorTotal,
    custoUnitario,
    custoTotal,
    lucro: num(v.lucro, valorTotal - custoTotal),
    criadoEm: data(v.criadoEm),
    registradoPor: v.registradoPor ?? null,
  }
})

const STATUS = ['pedido', 'producao', 'pronto', 'entregue', 'cancelado']
const pedidos = lista('pedidos').map((p) => {
  const itens = (p.itens ?? []).map((i) => ({
    produtoId: resolverProduto(i.produtoId, `Pedido ${p.id}`) ?? '',
    produtoNome: i.produtoNome ?? '',
    quantidade: inteiro(i.quantidade),
    valorUnitario: num(i.valorUnitario),
  }))
  if (!STATUS.includes(p.status)) aviso(`Pedido ${p.id}: status "${p.status}" inválido; usado "pedido".`)
  return {
    cliente: String(p.cliente ?? '').trim() || '(sem nome)',
    contato: p.contato ?? '',
    itens,
    valorTotal: num(p.valorTotal, itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0)),
    dataPrevista: p.dataPrevista || null,
    observacoes: p.observacoes ?? '',
    status: STATUS.includes(p.status) ? p.status : 'pedido',
    criadoEm: data(p.criadoEm),
    criadoPor: p.criadoPor ?? null,
    atualizadoEm: data(p.atualizadoEm),
    atualizadoPor: p.atualizadoPor ?? null,
    entregueEm: data(p.entregueEm),
  }
})

const categorias = [...new Set([...lista('categorias'), ...produtos.map((p) => p.categoria)].filter(Boolean))]
const estoqueMinimo = typeof dump.config?.estoqueMinimo === 'number' ? dump.config.estoqueMinimo : null

// ---------- resumo ----------
const resumo = {
  produtos: produtos.length,
  movimentacoes: movimentacoes.length,
  vendas: vendas.length,
  pedidos: pedidos.length,
  categorias: categorias.length,
}
console.log('Dados lidos do dump:', resumo)
console.log(
  `Conferência: estoque total ${produtos.reduce((a, p) => a + p.quantidade, 0)} un · ` +
    `faturamento R$ ${vendas.reduce((a, v) => a + v.valorTotal, 0).toFixed(2)} · ` +
    `lucro R$ ${vendas.reduce((a, v) => a + v.lucro, 0).toFixed(2)}`
)

function mostrarAvisos() {
  if (avisos.length) console.log(`\n${avisos.length} aviso(s):\n - ${avisos.join('\n - ')}`)
}

if (simular) {
  mostrarAvisos()
  console.log('\nModo --simular: nada foi gravado.')
  process.exit(0)
}

// ---------- grava ----------
const { pool, tx } = await import('../src/db.js')

try {
  await tx(async (c) => {
    const ocupado = await c.query(
      `SELECT (SELECT count(*) FROM produtos) + (SELECT count(*) FROM vendas)
            + (SELECT count(*) FROM movimentacoes) + (SELECT count(*) FROM pedidos) AS n`
    )
    if (ocupado.rows[0].n > 0) {
      if (!limpar) {
        throw new Error('O banco já tem dados. Use --limpar para substituí-los (os usuários são mantidos).')
      }
      await c.query('TRUNCATE produtos, movimentacoes, vendas, pedidos, categorias, config')
      console.log('Dados anteriores apagados (--limpar).')
    }

    for (const p of produtos) {
      await c.query(
        `INSERT INTO produtos (id, nome, categoria, quantidade, foto, custo_unitario, preco_venda,
           criado_em, criado_por, atualizado_em, atualizado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, now()), $9, $10, $11)`,
        [p.id, p.nome, p.categoria, p.quantidade, p.foto, p.custo, p.preco, p.criadoEm, p.criadoPor, p.atualizadoEm, p.atualizadoPor]
      )
    }
    for (const nome of categorias) {
      await c.query('INSERT INTO categorias (nome) VALUES ($1) ON CONFLICT DO NOTHING', [nome])
    }
    if (estoqueMinimo !== null) {
      await c.query(`INSERT INTO config (chave, valor) VALUES ('estoqueMinimo', $1::jsonb)`, [JSON.stringify(estoqueMinimo)])
    }
    for (const m of movimentacoes) {
      await c.query(
        `INSERT INTO movimentacoes (produto_id, produto_nome, tipo, quantidade, motivo, criado_em, registrado_por)
         VALUES ($1,$2,$3,$4,$5, COALESCE($6::timestamptz, now()), $7)`,
        [m.produtoId, m.produtoNome, m.tipo, m.quantidade, m.motivo, m.criadoEm, m.registradoPor]
      )
    }
    for (const v of vendas) {
      await c.query(
        `INSERT INTO vendas (produto_id, produto_nome, quantidade, valor_unitario, valor_total,
           custo_unitario, custo_total, lucro, criado_em, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::timestamptz, now()), $10)`,
        [v.produtoId, v.produtoNome, v.quantidade, v.valorUnitario, v.valorTotal, v.custoUnitario, v.custoTotal, v.lucro, v.criadoEm, v.registradoPor]
      )
    }
    for (const p of pedidos) {
      await c.query(
        `INSERT INTO pedidos (cliente, contato, itens, valor_total, data_prevista, observacoes, status,
           criado_em, criado_por, atualizado_em, atualizado_por, entregue_em)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7, COALESCE($8::timestamptz, now()), $9, $10, $11, $12)`,
        [p.cliente, p.contato, JSON.stringify(p.itens), p.valorTotal, p.dataPrevista, p.observacoes, p.status, p.criadoEm, p.criadoPor, p.atualizadoEm, p.atualizadoPor, p.entregueEm]
      )
    }

    // Confere o que ficou gravado antes de confirmar a transação.
    const gravado = (
      await c.query(
        `SELECT (SELECT count(*) FROM produtos) AS produtos, (SELECT count(*) FROM movimentacoes) AS movimentacoes,
                (SELECT count(*) FROM vendas) AS vendas, (SELECT count(*) FROM pedidos) AS pedidos,
                (SELECT count(*) FROM categorias) AS categorias`
      )
    ).rows[0]
    for (const k of Object.keys(resumo)) {
      if (gravado[k] !== resumo[k]) throw new Error(`Divergência em ${k}: esperado ${resumo[k]}, gravado ${gravado[k]}.`)
    }
  })
  mostrarAvisos()
  console.log('\nImportação concluída com sucesso.')
} catch (err) {
  console.error(`\nFalhou, nada foi gravado: ${err.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
