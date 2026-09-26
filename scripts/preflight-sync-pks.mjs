import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cfnimvrxrnmefmxtzqks.supabase.co'

const CSV_PATH =
  'E:\\PROJECT BLUE PRINT\\APLIKASI SIPAPUA DAN DASHBOARD PKS\\DAFTAR_LOGIN_PKS_75_AKUN.csv'

const secretKey = process.env.SUPABASE_SECRET_KEY

if (!secretKey) {
  console.error('ERROR: SUPABASE_SECRET_KEY belum tersedia.')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`ERROR: File CSV tidak ditemukan:\n${CSV_PATH}`)
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

const expectedHeaders = [
  'no',
  'wilayah',
  'divisi',
  'nama',
  'username',
  'password_baru',
  'komsel',
  'jabatan',
  'role',
  'status',
]

const csvText = fs.readFileSync(CSV_PATH, 'utf8')
const rows = parseCsv(csvText)

const actualHeaders = parseCsvLine(
  csvText.replace(/^\uFEFF/, '').split(/\r?\n/)[0],
)

const missingHeaders = expectedHeaders.filter(
  (header) => !actualHeaders.includes(header),
)

if (missingHeaders.length > 0) {
  console.error('ERROR: Header CSV tidak sesuai.')
  console.error('Missing:', missingHeaders.join(', '))
  process.exit(1)
}

if (rows.length !== 75) {
  console.error(
    `ERROR: CSV berisi ${rows.length} baris, seharusnya 75.`,
  )
  process.exit(1)
}

if (rows.some((row) => row.role !== 'pks')) {
  console.error(
    'ERROR: Ada baris CSV yang role-nya bukan "pks".',
  )
  process.exit(1)
}

if (rows.some((row) => !row.username || !row.password_baru)) {
  console.error(
    'ERROR: Ada akun yang username atau password_baru kosong.',
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
console.log('     PRE-FLIGHT SYNC PKS')
console.log('======================================')
console.log(`CSV rows          : ${rows.length}`)

const { data: profiles, error: profileError } =
  await supabase
    .from('pks_profiles')
    .select(
      'id,email,nama,wilayah,divisi,role,status',
    )
    .eq('role', 'pks')

if (profileError) {
  console.error(
    'ERROR membaca pks_profiles:',
    profileError.message,
  )
  process.exit(1)
}

console.log(`PKS profiles      : ${profiles.length}`)

if (profiles.length !== 75) {
  console.error(
    'ERROR: Jumlah profile PKS bukan 75.',
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
    'ERROR membaca auth.users:',
    authError.message,
  )
  process.exit(1)
}

const authUsers = authResult.users

console.log(`Auth users        : ${authUsers.length}`)

const profileByEmail = new Map(
  profiles.map((profile) => [
    String(profile.email).toLowerCase(),
    profile,
  ]),
)

const authByEmail = new Map(
  authUsers
    .filter((user) => user.email)
    .map((user) => [
      String(user.email).toLowerCase(),
      user,
    ]),
)

let matched = 0
const errors = []

for (const row of rows) {
  const email = String(row.username).trim().toLowerCase()

  const profile = profileByEmail.get(email)
  const authUser = authByEmail.get(email)

  if (!profile) {
    errors.push(
      `${row.no}: profile tidak ditemukan untuk ${email}`,
    )
    continue
  }

  if (!authUser) {
    errors.push(
      `${row.no}: auth user tidak ditemukan untuk ${email}`,
    )
    continue
  }

  if (profile.id !== authUser.id) {
    errors.push(
      `${row.no}: UID profile/auth berbeda untuk ${email}`,
    )
    continue
  }

  if (profile.role !== 'pks') {
    errors.push(
      `${row.no}: role profile bukan pks untuk ${email}`,
    )
    continue
  }

  matched++
}

console.log(`Profile/Auth match : ${matched}/75`)

if (errors.length > 0) {
  console.log('')
  console.log('============ ERROR ============')

  for (const error of errors) {
    console.log(error)
  }

  console.log('')
  console.log(
    'PRE-FLIGHT GAGAL. Tidak ada password yang diubah.',
  )

  process.exit(1)
}

console.log('')
console.log(
  'PRE-FLIGHT LULUS: 75/75 akun PKS cocok.',
)
console.log(
  'Tidak ada password atau data database yang diubah.',
)
console.log('')