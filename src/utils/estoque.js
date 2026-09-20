import { doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { workspaceCollection, workspaceDoc, usuarioAtual, registradoPor } from './workspace.js'
import { adicionarCategoria } from './categorias.js'

function produtosCol() {
  return workspaceCollection('produtos')
}

function movimentacoesCol() {
  return workspaceCollection('movimentacoes')
}

export async function getProdutos() {
  const snap = await getDocs(produtosCol())
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getMovimentacoes() {
  const q = query(movimentacoesCol(), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function registrarProduto({ nome, quantidade, foto, custoUnitario, precoVenda, categoria }) {
  usuarioAtual()
  const produtos = await getProdutos()
  const nomeNormalizado = nome.trim()
  const categoriaNormalizada = categoria?.trim() || ''
  const existente = produtos.find(
    (p) => p.nome.trim().toLowerCase() === nomeNormalizado.toLowerCase()
  )

  let produtoId
  if (existente) {
    const dados = {
      custoUnitario,
      precoVenda,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: registradoPor(),
    }
    if (categoriaNormalizada) dados.categoria = categoriaNormalizada
    if (foto) dados.foto = foto
    await updateDoc(workspaceDoc('produtos', existente.id), dados)
    produtoId = existente.id
  } else {
    const ref = await addDoc(produtosCol(), {
      nome: nomeNormalizado,
      categoria: categoriaNormalizada,
      quantidade: 0,
      foto: foto ?? null,
      custoUnitario,
      precoVenda,
      criadoEm: new Date().toISOString(),
      criadoPor: registradoPor(),
    })
    produtoId = ref.id
  }

  if (categoriaNormalizada) await adicionarCategoria(categoriaNormalizada)

  const { produtos: produtosAtualizados } = await registrarMovimentacao({
    produtoId,
    tipo: 'entrada',
    quantidade,
    motivo: existente ? 'Produção adicionada' : 'Cadastro inicial',
  })

  return produtosAtualizados
}

export async function atualizarProduto(id, { nome, custoUnitario, precoVenda, foto, categoria }) {
  usuarioAtual()
  const dados = {
    nome: nome.trim(),
    custoUnitario,
    precoVenda,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: registradoPor(),
  }
  if (foto !== undefined) dados.foto = foto
  if (categoria !== undefined) {
    dados.categoria = categoria.trim()
    if (dados.categoria) await adicionarCategoria(dados.categoria)
  }

  await updateDoc(workspaceDoc('produtos', id), dados)
  return getProdutos()
}

export async function removerProduto(id) {
  usuarioAtual()
  await deleteDoc(workspaceDoc('produtos', id))
  return getProdutos()
}

export async function registrarMovimentacao({ produtoId, tipo, quantidade, motivo }) {
  usuarioAtual()
  const produtoRef = workspaceDoc('produtos', produtoId)
  const produtoSnap = await getDoc(produtoRef)
  const produto = produtoSnap.exists() ? { id: produtoSnap.id, ...produtoSnap.data() } : null

  if (produto) {
    const delta = tipo === 'entrada' ? quantidade : -quantidade
    const novaQuantidade = Math.max(0, produto.quantidade + delta)
    await updateDoc(produtoRef, {
      quantidade: novaQuantidade,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: registradoPor(),
    })
  }

  await addDoc(movimentacoesCol(), {
    produtoId,
    produtoNome: produto?.nome ?? '(produto removido)',
    tipo,
    quantidade,
    motivo: motivo || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
    criadoEm: new Date().toISOString(),
    registradoPor: registradoPor(),
  })

  const [produtos, movimentacoes] = await Promise.all([getProdutos(), getMovimentacoes()])
  return { produtos, movimentacoes }
}

export async function removerMovimentacao(id) {
  usuarioAtual()
  await deleteDoc(workspaceDoc('movimentacoes', id))
  return getMovimentacoes()
}
