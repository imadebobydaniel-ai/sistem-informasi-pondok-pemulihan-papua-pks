import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'

import {
  doc,
  getDoc,
} from 'firebase/firestore'

import { auth, db } from './firebase'

export type PksProfile = {
  uid: string
  nama: string
  email: string
  wilayah: string
  komsel: string
  jabatan: string
  role: 'pks'
  status: string
}

export async function getPksProfile(
  user: User,
): Promise<PksProfile | null> {
  const snapshot = await getDoc(
    doc(db, 'pks_users', user.uid),
  )

  if (!snapshot.exists()) {
    return null
  }

  return {
    uid: user.uid,
    ...snapshot.data(),
  } as PksProfile
}

export function watchAuth(
  callback: (
    user: User | null,
    profile: PksProfile | null,
  ) => void,
) {
  return onAuthStateChanged(
    auth,
    async (user) => {
      if (!user) {
        callback(null, null)
        return
      }

      try {
        const profile =
          await getPksProfile(user)

        callback(user, profile)
      } catch (error) {
        console.error(
          'Gagal memuat profil PKS:',
          error,
        )

        callback(user, null)
      }
    },
  )
}

export async function loginPks(
  email: string,
  password: string,
) {
  return signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  )
}

export async function logoutPks() {
  await signOut(auth)
}
