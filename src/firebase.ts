import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyDU2rk0rIF-sos_Sj7C5IMM9dU8z8p_VJM',
  authDomain: 'boby-apps-project.firebaseapp.com',
  databaseURL: 'https://boby-apps-project-default-rtdb.firebaseio.com/',
  projectId: 'boby-apps-project',
  storageBucket: 'boby-apps-project.appspot.com',
  messagingSenderId: '125984859692',
  appId: '1:125984859692:web:09f75df5d2e4b6e3bcd389',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const functions = getFunctions(app, 'asia-southeast2')
