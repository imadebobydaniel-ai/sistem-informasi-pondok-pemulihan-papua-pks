import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  'https://cfnimvrxrnmefmxtzqks.supabase.co'

const CSV_PATH =
  'E:\\PROJECT BLUE PRINT\\APLIKASI SIPAPUA DAN DASHBOARD PKS\\DAFTAR_LOGIN_PKS_75_AKUN.csv'

const RESULT_PATH =
  'E:\\PROJECT BLUE PRINT\\APLIKASI SIPAPUA DAN DASHBOARD PKS\\HASIL_SYNC_PASSWORD_PKS.csv'

const secretKey = process.env.SUPABASE_SECRET_KEY

if (!secretKey) {
  console.error('ERROR: SUPABASE_SECRET_KEY belum tersedia.')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`ERROR: CSV tidak ditemukan:\n${CSV_PATH}`)
  process.exit(1)
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

const rows = parseCsv(
  fs.readFileSync(CSV_PATH, 'utf8'),
)

if (rows.length !== 75) {
  console.error(
    `ERROR: Jumlah CSV ${rows.length}, bukan 75.`,
  )
  process.exit(1)
}

if (
  rows.some(
    (row) =>
      row.role !== 'pks' ||
      !row.username ||
      !row.password_baru,
  )
) {
  console.error(
    'ERROR: Ada credential PKS yang tidak valid.',
  )
  process.exit(1)
}

const supabase = createClient(
  SUPABASE_URL,
  secretKey,
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
console.log('       SYNC PASSWORD 75 AKUN PKS')
console.log('======================================')
console.log('')

const {
  data: profiles,
  error: profileError,
} = await supabase
  .from('pks_profiles')
  .select('id,email,nama,wilayah,divisi,role,status')
  .eq('role', 'pks')

if (profileError) {
  console.error(
    'ERROR pks_profiles:',
    profileError.message,
  )
  process.exit(1)
}

if (profiles.length !== 75) {
  console.error(
    `ERROR: pks_profiles = ${profiles.length}, bukan 75.`,
  )
  process.exit(1)
}

const {
  data: authResult,
  error: authError,
} = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 100,
})

if (authError) {
  console.error(
    'ERROR auth.users:',
    authError.message,
  )
  process.exit(1)
}

const profileByEmail = new Map(
  profiles.map((profile) => [
    String(profile.email).trim().toLowerCase(),
    profile,
  ]),
)

const authByEmail = new Map(
  authResult.users
    .filter((user) => user.email)
    .map((user) => [
      String(user.email).trim().toLowerCase(),
      user,
    ]),
)

const prepared = []

for (const row of rows) {
  const email = String(row.username)
    .trim()
    .toLowerCase()

  const profile = profileByEmail.get(email)
  const authUser = authByEmail.get(email)

  if (!profile || !authUser) {
    console.error(
      `ERROR mapping akun: ${email}`,
    )
    process.exit(1)
  }

  if (profile.id !== authUser.id) {
    console.error(
      `ERROR UID berbeda: ${email}`,
    )
    process.exit(1)
  }

  prepared.push({
    no: row.no,
    email,
    nama: profile.nama,
    wilayah: profile.wilayah,
    divisi: profile.divisi,
    uid: authUser.id,
    newPassword: row.password_baru,
  })
}

console.log(
  `Akun siap diproses : ${prepared.length}/75`,
)
console.log('')
console.log(
  'Mulai sinkronisasi password...',
)
console.log('')

const results = []

for (const account of prepared) {
  const {
    data,
    error,
  } = await supabase.auth.admin.updateUserById(
    account.uid,
    {
      password: account.newPassword,
    },
  )

  const success = !error && !!data?.user

  results.push({
    no: account.no,
    email: account.email,
    nama: account.nama,
    wilayah: account.wilayah,
    divisi: account.divisi,
    uid: account.uid,
    status: success ? 'BERHASIL' : 'GAGAL',
    error: error?.message ?? '',
  })

  if (success) {
    console.log(
      `[${account.no}/75] BERHASIL - ${account.email}`,
    )
  } else {
    console.error(
      `[${account.no}/75] GAGAL - ${account.email}`,
    )
    console.error(error?.message ?? 'Unknown error')
  }
}

const header =
  'no,email,nama,wilayah,divisi,uid,status,error\n'

const csvOutput = [
  header,
  ...results.map((result) => {
    const values = [
      result.no,
      result.email,
      result.nama,
      result.wilayah,
      result.divisi,
      result.uid,
      result.status,
      result.error,
    ]

    return values
      .map((value) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`,
      )
      .join(',')
  }),
].join('\n')

fs.writeFileSync(
  RESULT_PATH,
  csvOutput,
  'utf8',
)

const successCount = results.filter(
  (result) => result.status === 'BERHASIL',
).length

const failedCount = results.filter(
  (result) => result.status === 'GAGAL',
).length

console.log('')
console.log('======================================')
console.log('            HASIL SYNC')
console.log('======================================')
console.log(`Berhasil : ${successCount}`)
console.log(`Gagal    : ${failedCount}`)
console.log(`Total    : ${results.length}`)
console.log('')
console.log(
  `Laporan : ${RESULT_PATH}`,
)
console.log('')

if (failedCount > 0) {
  process.exit(2)
}

console.log(
  'SYNC PASSWORD 75 AKUN PKS SELESAI.',
)