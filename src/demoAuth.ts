const DEMO_STORAGE_KEY = 'sipapua-pks-demo-session-v1'

const WILAYAH = [
  'Abepura',
  'Sentani',
  'Doyo',
  'Arso 1',
  'Arso 2',
]

const DIVISI = [
  'Praise and Worship (PW)',
  'Multimedia & Sound Engineering',
  'Tamborin and Banner',
  'Event & Organizer',
  'Komsel Bapak',
  'Komsel Ibu',
  'Komsel Pelajar',
  'Komsel Mahasiswa',
  'Komsel Profesi',
  'Sekolah Minggu',
  'Lansia',
  'Team Doa',
  'Team Misi',
  'Perparkiran dan Keamanan',
  'General Affairs',
]

export type DemoPksProfile = {
  uid: string
  nama: string
  email: string
  password: string
  wilayah: string
  divisi: string
  komsel: string
  jabatan: string
  role: 'pks'
  status: 'active'
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export const DEMO_PKS_ACCOUNTS: DemoPksProfile[] = WILAYAH.flatMap(
  (wilayah, wilayahIndex) =>
    DIVISI.map((divisi, divisiIndex) => {
      const number = wilayahIndex * DIVISI.length + divisiIndex + 1

      return {
        uid: `demo-pks-${String(number).padStart(3, '0')}`,
        nama: `PKS ${wilayah} - ${divisi}`,
        email: `pks.${slug(wilayah)}.${slug(divisi)}@demo.sipapua.local`,
        password: `DemoPKS-${String(number).padStart(3, '0')}-2026!`,
        wilayah,
        divisi,
        komsel: 'Demo',
        jabatan: 'PKS',
        role: 'pks',
        status: 'active',
      }
    }),
)

export async function loginDemoPks(
  email: string,
  password: string,
) {
  const account = DEMO_PKS_ACCOUNTS.find(
    (item) =>
      item.email === email.trim().toLowerCase()
      && item.password === password,
  )

  if (!account) {
    throw new Error('DEMO_INVALID_CREDENTIALS')
  }

  const profile = { ...account }
  sessionStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify(profile),
  )

  return profile
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

export function logoutDemoPks() {
  sessionStorage.removeItem(DEMO_STORAGE_KEY)
}
