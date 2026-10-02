import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from './supabase'

const DEMO_STORAGE_KEY = 'sipapua-pks-demo-session-v2'

export class SupabaseSessionExpiredError extends Error {
  constructor() {
    super('Sesi login Anda telah berakhir. Silakan login kembali.')
    this.name = 'SupabaseSessionExpiredError'
  }
}

export type DemoPksProfile = {
  uid: string
  nama: string
  email: string
  wilayah: string
  divisi: string
  komsel: string
  jabatan: string
  role: 'pks' | 'admin'
  status: 'active'
}

export async function loginDemoPks(
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    throw new Error('AUTH_INVALID_CREDENTIALS')
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

  if (authError || !authData.user) {
    throw new Error(
      authError?.message || 'AUTH_INVALID_CREDENTIALS',
    )
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('pks_profiles')
      .select(
        'id,nama,email,wilayah,divisi,komsel,jabatan,role,status',
      )
      .eq('id', authData.user.id)
      .eq('status', 'active')
      .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    throw new Error('PKS_PROFILE_NOT_FOUND')
  }

  if (profile.role !== 'pks' && profile.role !== 'admin') {
    await supabase.auth.signOut()
    throw new Error('PKS_ROLE_INVALID')
  }

  const sessionProfile: DemoPksProfile = {
    uid: profile.id,
    nama: profile.nama,
    email: profile.email,
    wilayah: profile.wilayah,
    divisi: profile.divisi,
    komsel: profile.komsel,
    jabatan: profile.jabatan,
    role: profile.role,
    status: profile.status,
  }

  sessionStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify(sessionProfile),
  )

  return sessionProfile
}

export function getDemoPksSession(): DemoPksProfile | null {
  const raw = sessionStorage.getItem(DEMO_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as DemoPksProfile
  } catch {
    sessionStorage.removeItem(DEMO_STORAGE_KEY)
    return null
  }
}

// The PKS profile in sessionStorage is only a cache. Supabase writes need a
// live Supabase Auth session for the same user, so verify it with the server.
export async function requireSupabaseSession(): Promise<DemoPksProfile> {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new SupabaseSessionExpiredError()
  }

  const { data, error } = await supabase.auth.getUser()

  if (error && isAuthRetryableFetchError(error)) {
    throw new Error(
      'Tidak dapat menghubungi server login. Periksa koneksi lalu coba lagi.',
    )
  }

  if (error || !data.user || data.user.id !== profile.uid) {
    throw new SupabaseSessionExpiredError()
  }

  return profile
}

export async function logoutDemoPks() {
  sessionStorage.removeItem(DEMO_STORAGE_KEY)
  await supabase.auth.signOut()
}
