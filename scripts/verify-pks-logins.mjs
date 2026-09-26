import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APP_ENV_PATH =
  'E:\\PROJECT MASTER\\SIPAPUA\\DASHBOARD PKS\\.env'

const CSV_PATH =
  'E:\\PROJECT BLUE PRINT\\APLIKASI SIPAPUA DAN DASHBOARD PKS\\DAFTAR_LOGIN_PKS_75_AKUN.csv'

function readEnv(path) {
  const content = fs.readFileSync(path, 'utf8')
  const env = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const index = trimmed.indexOf('=')

    if (index === -1) {
      continue
    }

    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)

    env[key] = value
  }

  return env
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')

  const headers = parseCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? '',
      ]),
    )
  })
}

if (!fs.existsSync(APP_ENV_PATH)) {
  console.error('ERROR: File .env tidak ditemukan.')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error('ERROR: File CSV credential tidak ditemukan.')
  process.exit(1)
}

const env = readEnv(APP_ENV_PATH)

const supabaseUrl = env.VITE_SUPABASE_URL
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  console.error(
    'ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY tidak tersedia.',
  )
  process.exit(1)
}

const rows = parseCsv(
  fs.readFileSync(CSV_PATH, 'utf8'),
)

const wilayahTarget = [
  'Abepura',
  'Sentani',
  'Doyo',
  'Arso 1',
  'Arso 2',
]

const selected = []

for (const wilayah of wilayahTarget) {
  const row = rows.find(
    (item) =>
      String(item.wilayah).trim().toLowerCase() ===
      wilayah.toLowerCase(),
  )

  if (!row) {
    console.error(
      `ERROR: Tidak ditemukan akun untuk wilayah ${wilayah}.`,
    )
    process.exit(1)
  }

  selected.push(row)
}

const supabase = createClient(
  supabaseUrl,
  publishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

console.log('')
console.log('======================================')
console.log('       POST-SYNC LOGIN TEST PKS')
console.log('======================================')
console.log('')

let success = 0
let failed = 0

for (const row of selected) {
  const email = String(row.username).trim()
  const password = row.password_baru

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    failed++

    console.log(
      `[GAGAL] ${row.wilayah} - ${email}`,
    )
    console.log(
      `        Alasan: ${error?.message ?? 'User tidak ditemukan'}`,
    )

    continue
  }

  success++

  console.log(
    `[BERHASIL] ${row.wilayah} - ${email}`,
  )

  await supabase.auth.signOut()
}

console.log('')
console.log('======================================')
console.log('             HASIL TEST')
console.log('======================================')
console.log(`Berhasil : ${success}`)
console.log(`Gagal    : ${failed}`)
console.log(`Total    : ${selected.length}`)
console.log('')

if (failed > 0) {
  console.log('POST-SYNC TEST: ADA LOGIN YANG GAGAL.')
  process.exit(2)
}

console.log(
  'POST-SYNC TEST: 5/5 LOGIN BERHASIL.',
)