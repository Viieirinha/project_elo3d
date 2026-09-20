import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setCarregando(false)
    })
    return unsubscribe
  }, [])

  async function cadastrar(email, senha, nome) {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha)
    if (nome) {
      await updateProfile(credencial.user, { displayName: nome })
      setUser({ ...credencial.user, displayName: nome })
    }
  }

  async function entrar(email, senha) {
    await signInWithEmailAndPassword(auth, email, senha)
  }

  async function sair() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, carregando, cadastrar, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
