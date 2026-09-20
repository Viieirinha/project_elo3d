import { getDoc, getDocs, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { workspaceCollection, workspaceDoc, usuarioAtual, registradoPor } from './workspace.js'
import { getProdutos, registrarMovimentacao } from './estoque.js'

function vendasCol() {
  return workspaceCollection('vendas')
}

export async function getVendas() {
  const q = query(vendasCol(), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function registrarVenda({ produtoId, quantidade, valorUnitario }) {
  usuarioAtual()
  const produtos = await getProdutos()
  const produto = produtos.find((p) => p.id === produtoId)
  if (!produto) return getVendas()

  const custoUnitario = produto.custoUnitario ?? 0
  const valorTotal = quantidade * valorUnitario
  const custoTotal = quantidade * custoUnitario
  const lucro = valorTotal - custoTotal

  await addDoc(vendasCol(), {
    produtoId,
    produtoNome: produto.nome,
    quantidade,
    valorUnitario,
    valorTotal,
    custoUnitario,
    custoTotal,
    lucro,
    criadoEm: new Date().toISOString(),
    registradoPor: registradoPor(),
  })

  await registrarMovimentacao({ produtoId, tipo: 'saida', quantidade, motivo: 'Venda' })

  return getVendas()
}

export async function removerVenda(id) {
  usuarioAtual()
  const ref = workspaceDoc('vendas', id)
  const snap = await getDoc(ref)
  const venda = snap.exists() ? { id: snap.id, ...snap.data() } : null

  if (venda) {
    await registrarMovimentacao({
      produtoId: venda.produtoId,
      tipo: 'entrada',
      quantidade: venda.quantidade,
      motivo: 'Estorno de venda',
    })
  }

  await deleteDoc(ref)
  return getVendas()
}
