import { collection, doc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

// Todos os usuários autenticados compartilham o mesmo espaço de dados
// (estoque, vendas, categorias, etc.), como se fosse uma única empresa.
const WORKSPACE_ID = 'shared'

export function workspaceCollection(nome) {
  return collection(db, 'workspace', WORKSPACE_ID, nome)
}

export function workspaceDoc(nome, id) {
  return doc(db, 'workspace', WORKSPACE_ID, nome, id)
}

export function usuarioAtual() {
  const user = auth.currentUser
  if (!user) throw new Error('Usuário não autenticado')
  return user
}

export function registradoPor() {
  const user = auth.currentUser
  return user?.displayName || user?.email || null
}
