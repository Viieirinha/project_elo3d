// Exporta os dados do Firestore (workspace/shared) para um arquivo JSON.
//
//   FIREBASE_EMAIL=voce@exemplo.com FIREBASE_SENHA='...' node scripts/exportar-firebase.js [dump.json]
//
// Só lê; nada é alterado no Firebase. Requer Node 18+ e não precisa de npm install.
// Usa o login normal do sistema (e-mail/senha), então vale as mesmas regras do app.
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const API_KEY = 'AIzaSyAll278HMyi4TQGhmzhnUhJ4Y_Yso65a1U' // chave web pública do app
const PROJECT = 'projectelo3d'
const AUTH_URL = process.env.FIREBASE_AUTH_URL ?? 'https://identitytoolkit.googleapis.com'
const FS_URL = process.env.FIRESTORE_URL ?? 'https://firestore.googleapis.com'
const BASE = `${FS_URL}/v1/projects/${PROJECT}/databases/(default)/documents/workspace/shared`

export function decodeValue(v) {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decodeValue)
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {})
  return null
}

export function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]))
}

async function entrar(email, senha) {
  const res = await fetch(`${AUTH_URL}/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data.error?.message ?? res.status
    throw new Error(`Login no Firebase falhou (${msg}). Confira e-mail e senha do sistema atual.`)
  }
  return data.idToken
}

async function chamar(token, caminho) {
  const res = await fetch(`${BASE}/${caminho}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Firestore recusou "${caminho}" (${res.status}): ${data.error?.message ?? ''}`)
  }
  return data
}

async function listar(token, colecao) {
  const docs = []
  let pagina = ''
  do {
    const data = await chamar(token, `${colecao}?pageSize=300${pagina ? `&pageToken=${pagina}` : ''}`)
    for (const d of data?.documents ?? []) {
      docs.push({ id: d.name.split('/').pop(), ...decodeFields(d.fields ?? {}) })
    }
    pagina = data?.nextPageToken ?? ''
  } while (pagina)
  return docs
}

async function principal() {
  const { FIREBASE_EMAIL: email, FIREBASE_SENHA: senha } = process.env
  if (!email || !senha) {
    console.error('Defina FIREBASE_EMAIL e FIREBASE_SENHA (a conta que você usa no sistema atual).')
    process.exit(1)
  }
  const saida = process.argv[2] ?? 'dump.json'

  console.log('Entrando no Firebase...')
  const token = await entrar(email, senha)

  const dump = { exportadoEm: new Date().toISOString() }
  for (const colecao of ['produtos', 'movimentacoes', 'vendas', 'pedidos']) {
    dump[colecao] = await listar(token, colecao)
    console.log(`  ${colecao}: ${dump[colecao].length}`)
  }
  const categorias = await chamar(token, 'meta/categorias')
  const config = await chamar(token, 'meta/config')
  dump.categorias = decodeFields(categorias?.fields ?? {}).lista ?? []
  dump.config = decodeFields(config?.fields ?? {})
  console.log(`  categorias: ${dump.categorias.length}`)

  writeFileSync(saida, JSON.stringify(dump, null, 2), { mode: 0o600 })
  console.log(`\nSalvo em ${saida}. Este arquivo contém dados reais: não o publique nem o envie ao Git.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((err) => {
    console.error(`\nErro: ${err.message}`)
    process.exit(1)
  })
}
