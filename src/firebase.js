import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAll278HMyi4TQGhmzhnUhJ4Y_Yso65a1U',
  authDomain: 'projectelo3d.firebaseapp.com',
  projectId: 'projectelo3d',
  storageBucket: 'projectelo3d.firebasestorage.app',
  messagingSenderId: '743442384192',
  appId: '1:743442384192:web:210d7e96a265344bc826a5',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
