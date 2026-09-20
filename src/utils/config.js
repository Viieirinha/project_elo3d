import { getDoc, setDoc } from 'firebase/firestore'
import { workspaceDoc } from './workspace.js'

const DEFAULT_ESTOQUE_MINIMO = 5

function configRef() {
  return workspaceDoc('meta', 'config')
}

export async function getEstoqueMinimo() {
  const snap = await getDoc(configRef())
  const valor = snap.exists() ? snap.data().estoqueMinimo : undefined
  return typeof valor === 'number' ? valor : DEFAULT_ESTOQUE_MINIMO
}

export async function setEstoqueMinimo(valor) {
  await setDoc(configRef(), { estoqueMinimo: valor }, { merge: true })
}
