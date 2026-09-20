import { getDoc, setDoc } from 'firebase/firestore'
import { workspaceDoc } from './workspace.js'

function categoriasRef() {
  return workspaceDoc('meta', 'categorias')
}

export async function getCategorias() {
  const snap = await getDoc(categoriasRef())
  return snap.exists() ? snap.data().lista ?? [] : []
}

export async function adicionarCategoria(nome) {
  const normalizado = nome?.trim()
  if (!normalizado) return getCategorias()

  const categorias = await getCategorias()
  const existe = categorias.some((c) => c.toLowerCase() === normalizado.toLowerCase())
  const atualizadas = existe ? categorias : [...categorias, normalizado].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  await setDoc(categoriasRef(), { lista: atualizadas })
  return atualizadas
}

export async function removerCategoria(nome) {
  const categorias = await getCategorias()
  const atualizadas = categorias.filter((c) => c.toLowerCase() !== nome.toLowerCase())
  await setDoc(categoriasRef(), { lista: atualizadas })
  return atualizadas
}
