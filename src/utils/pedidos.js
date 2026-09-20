import { getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { workspaceCollection, workspaceDoc, usuarioAtual, registradoPor } from './workspace.js'
import { registrarVenda } from './vendas.js'

export const STATUS_PEDIDO = ['pedido', 'producao', 'pronto', 'entregue', 'cancelado']

function pedidosCol() {
  return workspaceCollection('pedidos')
}

export async function getPedidos() {
  const q = query(pedidosCol(), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function registrarPedido({ cliente, contato, itens, dataPrevista, observacoes }) {
  usuarioAtual()
  const valorTotal = itens.reduce((acc, item) => acc + item.quantidade * item.valorUnitario, 0)

  await addDoc(pedidosCol(), {
    cliente: cliente.trim(),
    contato: contato?.trim() || '',
    itens,
    valorTotal,
    dataPrevista: dataPrevista || null,
    observacoes: observacoes?.trim() || '',
    status: 'pedido',
    criadoEm: new Date().toISOString(),
    criadoPor: registradoPor(),
  })

  return getPedidos()
}

export async function atualizarStatusPedido(id, novoStatus) {
  usuarioAtual()
  const ref = workspaceDoc('pedidos', id)
  const snap = await getDoc(ref)
  const pedido = snap.exists() ? { id: snap.id, ...snap.data() } : null
  if (!pedido) return getPedidos()

  // Ao marcar como entregue, dá baixa no estoque registrando a venda de cada item.
  if (novoStatus === 'entregue' && pedido.status !== 'entregue') {
    for (const item of pedido.itens) {
      if (item.produtoId) {
        await registrarVenda({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
        })
      }
    }
  }

  await updateDoc(ref, {
    status: novoStatus,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: registradoPor(),
    ...(novoStatus === 'entregue' ? { entregueEm: new Date().toISOString() } : {}),
  })

  return getPedidos()
}

export async function removerPedido(id) {
  usuarioAtual()
  await deleteDoc(workspaceDoc('pedidos', id))
  return getPedidos()
}
