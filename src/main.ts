import './style.css'
import logoIbn from './assets/logo-ibn.png'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loginDemoPks, logoutDemoPks, getDemoPksSession } from './demoAuth'
import { listMyEvents, createEvent, updateEvent, deleteEvent } from './eventService'
import { listMyAgendas, createAgenda, updateAgenda, deleteAgenda as deleteAgendaSupabase } from './agendaService'
import { listMyAnnualActivities, createAnnualActivity, updateAnnualActivity, deleteAnnualActivity } from './annualActivityService'
type PhotoData = {
  id: string
  name: string
  dataUrl: string
}

type EventJemaatItem = {
  id: string
  nama: string
  lokasi: string
  tgl: string
  isi: string
  fotos: string[]
  createdBy: string
  createdAt: string
  wilayah: string
  divisi: string
  komsel: string
  jabatan: string
  ownerUid: string
  ownerEmail: string
  ownerNama: string
}
type AgendaItem = {
  id: string
  wilayah: string
  divisi: string
  tahun: number
  periode: string
  bulan: string
  programKerja: string
  tujuanPelaksanaan: string
  sasaranTarget: string
  estimasiPencapaian: string
  mingguI: string
  mingguII: string
  mingguIII: string
  mingguIV: string
  keterangan: string
  kendalaPelaksanaan: string
  tindakLanjut: string
  photos: PhotoData[]
}



const periode = [
  'Triwulan I',
  'Triwulan II',
  'Triwulan III',
  'Triwulan IV',
]

const bulan = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]


let eventsJemaat: EventJemaatItem[] = []

type AnnualActivityItem = {
  id: string
  wilayah: string
  divisi: string
  namaKegiatan: string
  tanggalKegiatan: string
  tahunKegiatan: number
  lokasiKegiatan: string
  agendaKegiatan: string
  keterangan: string
  photos: PhotoData[]
}

let annualActivities: AnnualActivityItem[] = []
let editingAnnualActivityId: string | null = null
let editingEventId: string | null = null

async function loadEventsJemaat() {
  try {
    const profile = getDemoPksSession()

    if (!profile) {
      eventsJemaat = []
      return
    }

    const items = await listMyEvents(profile)

    eventsJemaat = items.map(({ event, photos }) => ({
      id: event.id,
      nama: event.nama,
      lokasi: event.lokasi ?? '',
      tgl: event.tanggal,
      isi: event.isi ?? '',
      fotos: photos
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((photo) => photo.url),
      createdBy: profile.nama,
      createdAt: event.created_at,
      wilayah: profile.wilayah,
      divisi: profile.divisi,
      komsel: profile.komsel,
      jabatan: profile.jabatan,
      ownerUid: event.owner_id,
      ownerEmail: profile.email,
      ownerNama: profile.nama,
    }))
  } catch (error) {
    console.error('Gagal memuat Event Jemaat:', error)
    eventsJemaat = []
  }
}

async function saveEventJemaat(
  input: Omit<EventJemaatItem, 'id'>
) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('Sesi PKS tidak ditemukan.')
  }

  return createEvent(profile, {
    nama: input.nama,
    lokasi: input.lokasi,
    tgl: input.tgl,
    isi: input.isi,
    fotos: input.fotos,
  })
}

async function updateEventJemaat(
  eventId: string,
  input: Pick<EventJemaatItem, 'nama' | 'lokasi' | 'tgl' | 'isi' | 'fotos'>
) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('Sesi PKS tidak ditemukan.')
  }

  return updateEvent(profile, eventId, {
    nama: input.nama,
    lokasi: input.lokasi,
    tgl: input.tgl,
    isi: input.isi,
    fotos: input.fotos,
  })
}

async function deleteEventJemaat(eventId: string) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('Sesi PKS tidak ditemukan.')
  }

  await deleteEvent(profile, eventId)
}
let agendas: AgendaItem[] = []
let editingId: string | null = null
let selectedAgendaIds = new Set<string>()

const filters = {
  bulan: 'all',
  tahun: 'all',
}


async function loadAgendasFromSupabase() {
  try {
    const profile = getDemoPksSession()

    if (!profile) {
      agendas = []
      return
    }

    const result = await listMyAgendas(profile)

    agendas = result.map(({ agenda, photos }) => ({
      id: agenda.id,
      wilayah: agenda.wilayah,
      divisi: agenda.divisi,
      tahun: agenda.tahun,
      periode: agenda.periode,
      bulan: agenda.bulan,
      programKerja: agenda.program_kerja,
      tujuanPelaksanaan: agenda.tujuan_pelaksanaan,
      sasaranTarget: agenda.sasaran_target,
      estimasiPencapaian: agenda.estimasi_pencapaian ?? '',
      mingguI: agenda.minggu_i ?? '',
      mingguII: agenda.minggu_ii ?? '',
      mingguIII: agenda.minggu_iii ?? '',
      mingguIV: agenda.minggu_iv ?? '',
      keterangan: agenda.keterangan ?? '',
      kendalaPelaksanaan: agenda.kendala_pelaksanaan ?? '',
      tindakLanjut: agenda.tindak_lanjut ?? '',
      photos: photos.map((photo) => ({
        id: photo.id,
        name: photo.caption || `Foto ${photo.sort_order}`,
        dataUrl: photo.url,
      })),
    } satisfies AgendaItem))
  } catch (error) {
    console.error('Gagal memuat agenda dari Supabase:', error)
    agendas = []
  }
}
async function saveAgendaToSupabase(item: AgendaItem) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('PKS_SESSION_NOT_FOUND')
  }

  const input = {
    tahun: item.tahun,
    periode: item.periode,
    bulan: item.bulan,
    programKerja: item.programKerja,
    tujuanPelaksanaan: item.tujuanPelaksanaan,
    sasaranTarget: item.sasaranTarget,
    estimasiPencapaian: item.estimasiPencapaian,
    mingguI: item.mingguI,
    mingguII: item.mingguII,
    mingguIII: item.mingguIII,
    mingguIV: item.mingguIV,
    keterangan: item.keterangan,
    kendalaPelaksanaan: item.kendalaPelaksanaan,
    tindakLanjut: item.tindakLanjut,
    photos: item.photos.map((photo) => photo.dataUrl),
  }

  if (editingId) {
    await updateAgenda(profile, item.id, input)
  } else {
    await createAgenda(profile, input)
  }
}
async function deleteAgendaFromSupabase(id: string) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('PKS_SESSION_NOT_FOUND')
  }

  await deleteAgendaSupabase(profile, id)
}


function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function years() {
  const currentYear = new Date().getFullYear()
  return Array.from(
    { length: 11 },
    (_, index) => currentYear + index
  )
}

function optionList(items: string[], selected: string, includeAll = false) {
  const all = includeAll
    ? `<option value="all"${selected === 'all' ? ' selected' : ''}>Semua</option>`
    : ''

  return all + items.map((item) => `
    <option value="${escapeHtml(item)}"${item === selected ? ' selected' : ''}>
      ${escapeHtml(item)}
    </option>
  `).join('')
}

function filteredAgendas() {
  return agendas
    .filter((item) => filters.tahun === 'all' || String(item.tahun) === filters.tahun)
    .sort((a, b) => {
      if (a.tahun !== b.tahun) return b.tahun - a.tahun

      const monthDiff = bulan.indexOf(a.bulan) - bulan.indexOf(b.bulan)
      if (monthDiff !== 0) return monthDiff

      return a.programKerja.localeCompare(b.programKerja)
    })
}

function renderShell(content: string) {
  const currentRoute = (window.location.hash || '#dashboard').replace(/^#/, '')
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="app-shell">
      <header class="site-header">
        <div class="brand">
          <div class="brand-logo">
            <img src="${logoIbn}" alt="Logo IBN" />
          </div>

          <div>
            <strong>SIPAPUA</strong>
            <span>Portal PKS / Pemimpin Pondok Pemulihan Papua</span>
          </div>
        </div>

        <div class="header-actions">
          ${currentRoute === "workspace" ? `
            <button class="cancel-login-button" type="button" id="logoutPksButton">Keluar</button>
          ` : ""}
          ${currentRoute === "dashboard" ? `
            <button class="login-button" type="button" id="loginButton">Login PKS</button>
          ` : ""}
        </div>
      </header>

      ${content}

      <footer class="site-footer">
        <span>SIPAPUA Portal PKS</span>
        <span>(C) 2026 Pondok Pemulihan Papua</span>
      </footer>
    </div>
  `

  document.querySelector('#loginButton')?.addEventListener('click', () => {
    openPksLogin()
  })

}

function openPksLogin() {
  if (document.querySelector('#pksLoginModal')) return

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="pksLoginModal">
      <div class="modal" style="width:min(100%,460px);max-width:460px;max-height:calc(100vh - 40px);overflow:hidden;">
        <div class="modal-header">
          <div>
            <p class="eyebrow">PORTAL INTERNAL</p>
            <h2>Login PKS</h2>
          </div>

          <button
            class="close-button"
            type="button"
            id="closePksLogin"
            aria-label="Tutup">
            &times;
          </button>
        </div>

        <form id="pksLoginForm" style="padding:20px;box-sizing:border-box;width:100%;">
          <div class="form-section">
            <div class="field">
              <label for="loginEmail">Email *</label>
              <input
                id="loginEmail"
                type="email"
                autocomplete="username"
                required />
            </div>

            <div class="field">
              <label for="loginPassword">Password *</label>
              <div class="password-field">
                <input
                  id="loginPassword"
                  type="password"
                  autocomplete="current-password"
                  required />
                <button
                  class="password-toggle"
                  type="button"
                  id="togglePksPassword"
                  aria-label="Tampilkan password">
                  <span class="eye-icon" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="cancel-login-button"
              type="button"
              id="cancelPksLogin">
              Batal
            </button>

            <button
              class="primary-button"
              type="submit"
              id="submitPksLogin">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>

  `)

  const close = () => {
    document.querySelector('#pksLoginModal')?.remove()
  }

  document.querySelector('#closePksLogin')?.addEventListener(
    'click',
    close
  )

  document.querySelector('#cancelPksLogin')?.addEventListener(
    'click',
    close
  )

  document.querySelector('#pksLoginModal')?.addEventListener(
    'click',
    (event) => {
      if (event.target === event.currentTarget) {
        close()
      }
    }
  )

  document.querySelector('#togglePksPassword')?.addEventListener('click', () => {
    const input = document.querySelector('#loginPassword') as HTMLInputElement | null
    const toggle = document.querySelector('#togglePksPassword') as HTMLButtonElement | null

    if (!input || !toggle) return

    if (input.type === 'password') {
      input.type = 'text'
      toggle.innerHTML = '<span class="eye-icon" aria-hidden="true"></span>'
      toggle.setAttribute('aria-label', 'Sembunyikan password')
    } else {
      input.type = 'password'
      toggle.innerHTML = '<span class="eye-icon" aria-hidden="true"></span>'
      toggle.setAttribute('aria-label', 'Tampilkan password')
    }
  })

  document.querySelector('#pksLoginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()

    const email = (document.querySelector('#loginEmail') as HTMLInputElement)?.value ?? ''
    const password = (document.querySelector('#loginPassword') as HTMLInputElement)?.value ?? ''
    const error = document.querySelector('#loginError') as HTMLDivElement | null
    const submitButton = document.querySelector('#submitPksLogin') as HTMLButtonElement | null

    if (error) {
      error.style.display = 'none'
      error.textContent = ''
    }

    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = 'Memproses...'
    }

    try {
      await loginDemoPks(email, password)
      close()
      navigateTo('workspace')
    } catch (loginError) {
      console.error('Login PKS gagal:', loginError)
      if (error) {
        error.textContent = 'Email atau password tidak valid.'
        error.style.display = 'block'
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Login'
      }
    }
  })
}
function openModuleInfo(title: string, description: string, status: string) {
  if (document.querySelector('#moduleInfoModal')) return

  const html = '<div class="modal-backdrop" id="moduleInfoModal">' +
    '<div class="modal" style="max-width:520px;">' +
      '<div class="modal-header">' +
        '<div>' +
          '<p class="eyebrow">INFORMASI MODUL</p>' +
          '<h2>' + title + '</h2>' +
        '</div>' +
        '<button class="close-button" type="button" id="closeModuleInfo" aria-label="Tutup">Tutup</button>' +
      '</div>' +
      '<div style="padding:20px;">' +
        '<p style="margin:0 0 14px;line-height:1.7;color:#4b635d;">' + description + '</p>' +
        '<div style="padding:12px 14px;border-radius:10px;background:#f4f8f6;color:#06382f;font-weight:700;">' + status + '</div>' +
        '<div class="modal-footer">' +
          '<button class="primary-button" type="button" id="closeModuleInfoButton">Tutup</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>'

  document.body.insertAdjacentHTML('beforeend', html)

  const close = () => {
    document.querySelector('#moduleInfoModal')?.remove()
  }

  document.querySelector('#closeModuleInfo')?.addEventListener('click', close)
  document.querySelector('#closeModuleInfoButton')?.addEventListener('click', close)
  document.querySelector('#moduleInfoModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      close()
    }
  })
}

function renderDashboard() {
  renderShell(`
    <main class="dashboard">
      <section class="welcome">
        <p class="eyebrow">PORTAL INTERNAL</p>

        <h1>
          Selamat Datang di Portal PKS dan Pemimpin Pondok Pemulihan Papua
        </h1>

        <p class="welcome-text">
          Pusat pengelolaan agenda, laporan, dan dokumentasi kegiatan
          Jemaat Pondok Pemulihan Papua.
        </p>
      </section>

      <section class="module-grid">
        <button
          class="module-card module-card-active"
          type="button"
          id="openAgenda">

          <div class="module-icon">01</div>

          <h2>Agenda Tahunan Terprogram</h2>

          <p>
            Kelola agenda tahunan seluruh wilayah dan divisi menggunakan
            satu template yang sama, termasuk dokumentasi foto.
          </p>

          <span class="module-link">
            Baca
          </span>
        </button>

        <article class="module-card" id="openEventBase">
          <div class="module-icon">02</div>
          <h2>Agenda Event Base</h2>

          <p>
            Modul untuk mencatat dan mengelola kegiatan khusus yang bersifat event atau kegiatan insidental, sehingga agenda di luar program tahunan tetap dapat terdokumentasi dengan rapi.
          </p>

          <span class="module-link">Baca</span>
        </article>

        <article class="module-card" id="openAnnualActivity">
          <div class="module-icon">03</div>
          <h2>Kegiatan Tahunan</h2>

          <p>
            Modul untuk menyusun dan mengelola kegiatan tahunan berdasarkan nama kegiatan, tanggal, lokasi, agenda, keterangan, serta dokumentasi foto.
          </p>

          <span class="module-link">Baca</span>
        </article>
      </section>
    </main>
  `)

  document.querySelector('#openAgenda')?.addEventListener('click', () => openModuleInfo('Agenda Tahunan Terprogram', 'Modul ini digunakan untuk mengelola program kerja tahunan berdasarkan wilayah dan divisi, termasuk jadwal, target, kendala, tindak lanjut, dan dokumentasi foto.', 'Akses modul tersedia setelah Login PKS.'))

  document.querySelector('#openEventBase')?.addEventListener('click', () => openModuleInfo('Agenda Event Base', 'Modul ini disiapkan untuk pengelolaan kegiatan khusus berbasis event. Fitur lengkapnya akan tersedia pada workspace internal PKS.', 'Segera tersedia - Login PKS diperlukan untuk akses internal.'))

  document.querySelector('#openAnnualActivity')?.addEventListener('click', () => openModuleInfo('Kegiatan Tahunan', 'Modul ini digunakan untuk mengelola dan memantau kegiatan tahunan jemaat berdasarkan data kegiatan yang dikelola PKS.', 'Akses modul tersedia setelah Login PKS.'))
}

function renderPksWorkspace() {
  const profile=getDemoPksSession()
  if (!profile) {
    renderDashboard()
    return
  }

  renderShell(`
    <main class="workspace-page">
      <section class="workspace-heading">
        <div>
          <p class="eyebrow">WORKSPACE PKS</p>
          <h1>Selamat Datang, ${profile.nama}</h1>
          <p class="welcome-text">Kelola program kerja sesuai wilayah dan divisi yang terdaftar pada akun Anda.</p>
        </div>
      </section>

      <section class="workspace-identity">
        <div><span>Wilayah</span><strong>${profile.wilayah}</strong></div>
        <div><span>Divisi / Tim</span><strong>${profile.divisi}</strong></div>
        <div><span>Komsel</span><strong>${profile.komsel}</strong></div>
        <div><span>Jabatan</span><strong>${profile.jabatan}</strong></div>
      </section>

      <section class="workspace-modules">
        <article class="module-card module-card-active">
          <div class="module-icon">01</div>
          <h2>Program Tahunan Terprogram</h2>
          <p>Kelola program kerja, jadwal, target, kendala, tindak lanjut, dan dokumentasi foto untuk wilayah dan divisi Anda.</p>
          <button class="module-link" type="button" id="openWorkspaceAgenda">Buka Modul</button>
        </article>

        <article class="module-card">
          <div class="module-icon">02</div>
          <h2>Event Jemaat</h2>
          <p>Kelola informasi kegiatan jemaat berdasarkan wilayah dan divisi akun Anda untuk ditampilkan pada halaman Event Jemaat.</p>
          <button class="module-link" type="button" id="openWorkspaceEventJemaat">Buka Modul</button>
        </article>

        <article class="module-card">
          <div class="module-icon">03</div>
          <h2>Kegiatan Tahunan</h2>
          <p>Kelola kegiatan tahunan berdasarkan nama kegiatan, tanggal, lokasi, agenda, keterangan, dan dokumentasi foto.</p>
          <button class="module-link" type="button" id="openWorkspaceAnnualActivity">Buka Modul</button>
        </article>
      </section>
    </main>
  `)

  document.querySelector("#openWorkspaceAgenda")?.addEventListener("click",()=>navigateTo("agenda"))
  document.querySelector("#openWorkspaceEventJemaat")?.addEventListener("click",()=>navigateTo("event-jemaat"))
  document.querySelector("#openWorkspaceAnnualActivity")?.addEventListener("click",()=>navigateTo("annual-report"))
  document.querySelector("#logoutPksButton")?.addEventListener("click",()=>{
    logoutDemoPks()

    navigateTo('dashboard')
  })
}

async function loadAnnualActivitiesFromSupabase() {
  try {
    const profile = getDemoPksSession()

    if (!profile) {
      annualActivities = []
      return
    }

    const items = await listMyAnnualActivities(profile)

    annualActivities = items.map(({ activity, photos }) => ({
      id: activity.id,
      wilayah: activity.wilayah,
      divisi: activity.divisi,
      namaKegiatan: activity.nama_kegiatan,
      tanggalKegiatan: activity.tanggal_kegiatan,
      tahunKegiatan: activity.tahun_kegiatan,
      lokasiKegiatan: activity.lokasi_kegiatan,
      agendaKegiatan: activity.agenda_kegiatan,
      keterangan: activity.keterangan ?? '',
      photos: photos.map((photo) => ({
        id: photo.id,
        name: photo.caption || `Foto ${photo.sort_order}`,
        dataUrl: photo.url,
      })),
    }))
  } catch (error) {
    console.error('Gagal memuat Kegiatan Tahunan:', error)
    annualActivities = []
  }
}

async function saveAnnualActivityToSupabase(item: AnnualActivityItem) {
  const profile = getDemoPksSession()

  if (!profile) {
    throw new Error('PKS_SESSION_NOT_FOUND')
  }

  const input = {
    namaKegiatan: item.namaKegiatan,
    tanggalKegiatan: item.tanggalKegiatan,
    tahunKegiatan: item.tahunKegiatan,
    lokasiKegiatan: item.lokasiKegiatan,
    agendaKegiatan: item.agendaKegiatan,
    keterangan: item.keterangan,
    photos: item.photos.map((photo) => photo.dataUrl),
  }

  if (editingAnnualActivityId) {
    await updateAnnualActivity(profile, item.id, input)
  } else {
    await createAnnualActivity(profile, input)
  }
}

function renderAnnualActivity() {
  const profile = getDemoPksSession()

  if (!profile) {
    renderDashboard()
    return
  }

  const rows = annualActivities

  renderShell(`
    <main class="agenda-page">
      <section class="page-heading">
        <div>
          <p class="eyebrow">MODUL 03</p>
          <h1>Kegiatan Tahunan</h1>
          <p>
            Kelola kegiatan tahunan untuk ${profile.wilayah} - ${profile.divisi}.
          </p>
        </div>

        <div class="page-heading-actions">
          <button
            class="secondary-button"
            type="button"
            id="backAnnualActivity">
            &#8592; Kembali
          </button>

          <button
            class="primary-button"
            type="button"
            id="addAnnualActivity">
            + Tambah Kegiatan
          </button>
        </div>
      </section>

      <section class="workspace-identity">
        <div><span>Wilayah</span><strong>${escapeHtml(profile.wilayah)}</strong></div>
        <div><span>Divisi / Tim</span><strong>${escapeHtml(profile.divisi)}</strong></div>
        <div><span>Komsel</span><strong>${escapeHtml(profile.komsel)}</strong></div>
        <div><span>Jumlah Kegiatan</span><strong>${rows.length}</strong></div>
      </section>

      <section class="table-card">
        ${
          rows.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>NAMA KEGIATAN</th>
                      <th>TANGGAL</th>
                      <th>TAHUN</th>
                      <th>LOKASI</th>
                      <th>AGENDA KEGIATAN</th>
                      <th>KETERANGAN</th>
                      <th>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((item) => `
                      <tr>
                        <td><strong>${escapeHtml(item.namaKegiatan)}</strong></td>
                        <td>${escapeHtml(item.tanggalKegiatan)}</td>
                        <td>${escapeHtml(item.tahunKegiatan)}</td>
                        <td>${escapeHtml(item.lokasiKegiatan)}</td>
                        <td>${escapeHtml(item.agendaKegiatan)}</td>
                        <td>${escapeHtml(item.keterangan || '-')}</td>
                        <td class="table-actions">
                          <button
                            class="secondary-button"
                            type="button"
                            data-edit-annual-activity="${escapeHtml(item.id)}">
                            Edit
                          </button>
                          <button
                            class="danger-button"
                            type="button"
                            data-delete-annual-activity="${escapeHtml(item.id)}">
                            Hapus
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty-state-card">
                <strong>Belum ada Kegiatan Tahunan.</strong>
                <p>Tambahkan kegiatan tahunan untuk wilayah dan divisi Anda.</p>
              </div>
            `
        }
      </section>
    </main>
  `)

  document.querySelector('#backAnnualActivity')?.addEventListener(
    'click',
    () => navigateTo('workspace'),
  )

  document.querySelector('#addAnnualActivity')?.addEventListener(
    'click',
    () => openAnnualActivityModal(),
  )

  document.querySelectorAll<HTMLElement>(
    '[data-edit-annual-activity]',
  ).forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.editAnnualActivity
      if (id) openAnnualActivityModal(id)
    })
  })

  document.querySelectorAll<HTMLElement>(
    '[data-delete-annual-activity]',
  ).forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.deleteAnnualActivity

      if (!id) return

      if (!confirm('Hapus Kegiatan Tahunan ini?')) return

      const profile = getDemoPksSession()

      if (!profile) return

      try {
        await deleteAnnualActivity(profile, id)
        await loadAnnualActivitiesFromSupabase()
        renderAnnualActivity()
      } catch (error) {
        console.error('Gagal menghapus Kegiatan Tahunan:', error)
        alert('Kegiatan Tahunan gagal dihapus.')
      }
    })
  })
}

function openAnnualActivityModal(id?: string) {
  const existing = id
    ? annualActivities.find((item) => item.id === id)
    : undefined

  editingAnnualActivityId = existing?.id ?? null

  const modal = document.createElement('div')
  modal.className = 'modal-backdrop'
  modal.id = 'annualActivityModal'

  modal.innerHTML = `
    <div class="modal event-editor-modal">
      <div class="modal-header">
        <div>
          <p class="eyebrow">MODUL 03</p>
          <h2>${existing ? 'Edit Kegiatan Tahunan' : 'Tambah Kegiatan Tahunan'}</h2>
        </div>

        <button
          class="close-button"
          type="button"
          id="closeAnnualActivityModal">
          &times;
        </button>
      </div>

      <form id="annualActivityForm">
        <div class="form-section">
          <h3>Informasi Kegiatan</h3>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label for="annualActivityNama">Nama Kegiatan</label>
              <input
                id="annualActivityNama"
                type="text"
                maxlength="200"
                required
                value="${escapeHtml(existing?.namaKegiatan || '')}" />
            </div>

            <div class="field">
              <label for="annualActivityTanggal">Tanggal Kegiatan</label>
              <input
                id="annualActivityTanggal"
                type="date"
                required
                value="${escapeHtml(existing?.tanggalKegiatan || '')}" />
            </div>

            <div class="field">
              <label for="annualActivityTahun">Tahun Kegiatan</label>
              <input
                id="annualActivityTahun"
                type="number"
                min="2000"
                max="2100"
                required
                value="${existing?.tahunKegiatan || new Date().getFullYear()}" />
            </div>

            <div class="field">
              <label for="annualActivityLokasi">Lokasi Kegiatan</label>
              <input
                id="annualActivityLokasi"
                type="text"
                maxlength="250"
                required
                value="${escapeHtml(existing?.lokasiKegiatan || '')}" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Agenda & Keterangan</h3>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label for="annualActivityAgenda">Agenda Kegiatan</label>
              <textarea
                id="annualActivityAgenda"
                rows="5"
                maxlength="5000"
                required>${escapeHtml(existing?.agendaKegiatan || '')}</textarea>
            </div>

            <div class="field">
              <label for="annualActivityKeterangan">Keterangan</label>
              <textarea
                id="annualActivityKeterangan"
                rows="5"
                maxlength="5000">${escapeHtml(existing?.keterangan || '')}</textarea>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-heading-row">
            <div>
              <h3>Dokumentasi Foto</h3>
              <p>Upload maksimal 5 foto dokumentasi kegiatan.</p>
            </div>

            <label class="upload-button">
              + Upload Foto
              <input
                id="annualActivityPhotos"
                type="file"
                accept="image/*"
                multiple
                hidden />
            </label>
          </div>

          <div class="photo-grid" id="annualActivityPhotoPreview"></div>
        </div>

        <div class="modal-footer">
          <button
            class="secondary-button"
            type="button"
            id="cancelAnnualActivity">
            Batal
          </button>

          <button
            class="primary-button"
            type="submit">
            Simpan Kegiatan
          </button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(modal)

  let photos: PhotoData[] = existing?.photos
    ? [...existing.photos]
    : []

  const renderPhotos = () => {
    const preview =
      document.querySelector<HTMLDivElement>(
        '#annualActivityPhotoPreview',
      )

    if (!preview) return

    preview.innerHTML = photos.length
      ? photos.map((photo) => `
          <div class="photo-item">
            <img
              src="${escapeHtml(photo.dataUrl)}"
              alt="${escapeHtml(photo.name)}" />

            <div class="photo-caption">
              <span>${escapeHtml(photo.name)}</span>

              <button
                type="button"
                data-remove-annual-activity-photo="${escapeHtml(photo.id)}">
                Hapus
              </button>
            </div>
          </div>
        `).join('')
      : '<p class="empty-state">Belum ada dokumentasi.</p>'
  }

  renderPhotos()

  document
    .querySelector<HTMLInputElement>('#annualActivityPhotos')
    ?.addEventListener('change', async (event) => {
      const input = event.currentTarget as HTMLInputElement

      for (const file of Array.from(input.files ?? [])) {
        if (photos.length >= 5) break

        photos.push({
          id: uid('annual-activity-photo'),
          name: file.name,
          dataUrl: await uploadEventPhoto(file),
        })
      }

      input.value = ''
      renderPhotos()
    })

  document
    .querySelector('#annualActivityPhotoPreview')
    ?.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-remove-annual-activity-photo]',
      )

      if (!button) return

      const id = button.dataset.removeAnnualActivityPhoto

      photos = photos.filter((photo) => photo.id !== id)
      renderPhotos()
    })

  document
    .querySelector('#closeAnnualActivityModal')
    ?.addEventListener('click', closeAnnualActivityModal)

  document
    .querySelector('#cancelAnnualActivity')
    ?.addEventListener('click', closeAnnualActivityModal)

  document
    .querySelector<HTMLFormElement>('#annualActivityForm')
    ?.addEventListener('submit', async (event) => {
      event.preventDefault()

      try {
        const tanggal = valueOf('annualActivityTanggal')
        const tahun = Number(valueOf('annualActivityTahun'))

        if (!tanggal || !tahun) {
          throw new Error('TANGGAL_DAN_TAHUN_WAJIB_DIISI')
        }

        const item: AnnualActivityItem = {
          id: editingAnnualActivityId || uid('annual-activity'),
          wilayah: getDemoPksSession()?.wilayah || '',
          divisi: getDemoPksSession()?.divisi || '',
          namaKegiatan: valueOf('annualActivityNama'),
          tanggalKegiatan: tanggal,
          tahunKegiatan: tahun,
          lokasiKegiatan: valueOf('annualActivityLokasi'),
          agendaKegiatan: valueOf('annualActivityAgenda'),
          keterangan: valueOf('annualActivityKeterangan'),
          photos,
        }

        if (
          !item.namaKegiatan.trim() ||
          !item.lokasiKegiatan.trim() ||
          !item.agendaKegiatan.trim()
        ) {
          throw new Error('FIELD_KEGIATAN_WAJIB_DIISI')
        }

        await saveAnnualActivityToSupabase(item)
        await loadAnnualActivitiesFromSupabase()
        closeAnnualActivityModal()
        renderAnnualActivity()
      } catch (error) {
        console.error('Gagal menyimpan Kegiatan Tahunan:', error)

        alert(
          error instanceof Error
            ? error.message
            : 'Kegiatan Tahunan gagal disimpan.',
        )
      }
    })
}

function closeAnnualActivityModal() {
  document.querySelector('#annualActivityModal')?.remove()
  editingAnnualActivityId = null
}
function renderEventJemaat() {
  const profile = getDemoPksSession()
  if (!profile) {
    renderDashboard()
    return
  }

  const rows = eventsJemaat

  renderShell(`
    <main class="event-jemaat-page">
      <section class="page-heading">
        <div>
          <p class="eyebrow">MODUL 02</p>
          <h1>Event Jemaat</h1>
          <p>
            Kelola informasi kegiatan jemaat untuk
            ${profile.wilayah} - ${profile.divisi}.
          </p>
        </div>

                <div class="page-heading-actions">
          <button
            class="secondary-button"
            type="button"
            id="backEventJemaat">
            &#8592;Â Kembali
          </button>

          <button
            class="primary-button"
            type="button"
            id="addEventJemaat">
            + Tambah Event
          </button>
        </div>
      </section>

      <section class="workspace-identity">
        <div>
          <span>Wilayah</span>
          <strong>${profile.wilayah}</strong>
        </div>
        <div>
          <span>Divisi / Tim</span>
          <strong>${profile.divisi}</strong>
        </div>
        <div>
          <span>Komsel</span>
          <strong>${profile.komsel}</strong>
        </div>
        <div>
          <span>Jabatan</span>
          <strong>${profile.jabatan}</strong>
        </div>
      </section>

      <section class="table-card">
        <div class="table-card-header">
          <div>
            <h2>Daftar Event Jemaat</h2>
            <p>Event yang dibuat oleh akun PKS ini.</p>
          </div>
          <strong>${rows.length} event</strong>
        </div>

        ${
          rows.length
            ? `
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Nama Kegiatan</th>
                      <th>Lokasi</th>
                      <th>Tanggal</th>
                      <th>Wilayah</th>
                      <th>Divisi / Tim</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows
                      .map(
                        (event, index) => `
                          <tr>
                            <td>${index + 1}</td>
                            <td>
                              <strong>${event.nama || '-'}</strong>
                            </td>
                            <td>${event.lokasi || '-'}</td>
                            <td>${event.tgl || '-'}</td>
                            <td>${event.wilayah || profile.wilayah}</td>
                            <td>${event.divisi || profile.divisi}</td>
                            <td>
                              <div class="table-actions">
                                <button
                                  class="secondary-button"
                                  type="button"
                                  data-edit-event="${event.id}">
                                  Edit
                                </button>
                                <button
                                  class="danger-button"
                                  type="button"
                                  data-delete-event="${event.id}">
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            : `
                            <div class="empty-state-card">
                <h2>Belum Ada Event</h2>
                <p>
                  Belum ada kegiatan jemaat yang dibuat oleh akun ini.
                  Gunakan tombol <strong>+ Tambah Event</strong> untuk
                  memasukkan kegiatan pertama.
                </p>
              </div>
            `
        }
      </section>
    </main>
  `)

    document.querySelector('#backEventJemaat')?.addEventListener('click', () => {
    navigateTo('workspace')
  })

  document.querySelector('#addEventJemaat')?.addEventListener('click', () => {
    openEventJemaatForm()
  })

  document.querySelectorAll<HTMLElement>('[data-edit-event]').forEach((button) => {
    button.addEventListener('click', () => {
      const eventId = button.dataset.editEvent

      if (!eventId) return

      openEventJemaatForm(eventId)
    })
  })

  document.querySelectorAll<HTMLElement>('[data-delete-event]').forEach((button) => {
    button.addEventListener('click', async () => {
      const eventId = button.dataset.deleteEvent

      if (!eventId) return

      const confirmed = window.confirm('Apakah anda ingin menghapus data tersebut ?')

      if (!confirmed) return

      try {
        await deleteEventJemaat(eventId)
        await loadEventsJemaat()
        renderEventJemaat()
      } catch (error) {
        console.error(error)
        alert(
          error instanceof Error
            ? error.message
            : 'Gagal menghapus Event Jemaat.'
        )
      }
    })
  })
}
async function uploadEventPhoto(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`File ${file.name} bukan file gambar.`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'sipapua_preset')

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/dxzllsbgi/image/upload',
    {
      method: 'POST',
      body: formData,
    }
  )

  const data = await response.json() as {
    secure_url?: string
    error?: { message?: string }
  }

  if (!response.ok || !data.secure_url) {
    throw new Error(
      data.error?.message || `Gagal mengunggah ${file.name}.`
    )
  }

  return data.secure_url
}

function openEventJemaatForm(id?: string) {
  const profile = getDemoPksSession()

  if (!profile) {
    renderDashboard()
    return
  }

  const existing = id
    ? eventsJemaat.find((event) => event.id === id)
    : undefined

  if (id && !existing) {
    alert('Data Event Jemaat tidak ditemukan.')
    return
  }

  editingEventId = id ?? null

  document.querySelector('#eventJemaatModal')?.remove()

  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <div class="modal-backdrop" id="eventJemaatModal">
        <div class="modal modal-large event-editor-modal">
          <div class="modal-header">
            <div>
              <p class="eyebrow">MODUL 02</p>
              <h2>${existing ? 'Edit Event Jemaat' : 'Tambah Event Jemaat'}</h2>
              <p class="modal-subtitle">
                Lengkapi informasi kegiatan yang akan ditampilkan kepada jemaat.
              </p>
            </div>

            <button
              class="close-button"
              type="button"
              id="closeEventJemaatModal"
              aria-label="Tutup">
              &times;
            </button>
          </div>

          <form id="eventJemaatForm" class="event-editor-form">
            <div class="event-editor-grid">
              <section class="event-form-section">
                <div class="section-heading">
                  <span class="section-number">01</span>
                  <div>
                    <h3>Informasi Kegiatan</h3>
                    <p>Data utama kegiatan jemaat.</p>
                  </div>
                </div>

                <div class="field">
                  <label for="eventNama">Nama Kegiatan *</label>
                  <input
                    id="eventNama"
                    type="text"
                    maxlength="160"
                    value="${escapeHtml(existing?.nama ?? '')}"
                    placeholder="Contoh: Ibadah Pemuda"
                    required />
                </div>

                <div class="event-form-two-column">
                  <div class="field">
                    <label for="eventLokasi">Lokasi *</label>
                    <input
                      id="eventLokasi"
                      type="text"
                      maxlength="160"
                      value="${escapeHtml(existing?.lokasi ?? '')}"
                      placeholder="Contoh: Gedung Jemaat"
                      required />
                  </div>

                  <div class="field">
                    <label for="eventTanggal">Tanggal *</label>
                    <input
                      id="eventTanggal"
                      type="date"
                      value="${escapeHtml(existing?.tgl ?? '')}"
                      required />
                  </div>
                </div>

                <div class="field">
                  <label for="eventIsi">Isi Detail</label>
                  <textarea
                    id="eventIsi"
                    rows="8"
                    maxlength="5000"
                    placeholder="Tuliskan informasi atau detail kegiatan jemaat...">${escapeHtml(existing?.isi ?? '')}</textarea>
                </div>
              </section>

              <section class="event-form-section">
                <div class="section-heading">
                  <span class="section-number">02</span>
                  <div>
                    <h3>Dokumentasi Foto</h3>
                    <p>Cloudinary &middot; maksimal 5 foto per event.</p>
                  </div>
                </div>

                <div class="event-upload-box">
                  <input
                    id="eventPhotos"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden />

                  <label class="event-upload-label" for="eventPhotos">
                    <span class="event-upload-icon">+</span>
                    <strong>Pilih Foto</strong>
                    <span>JPG, JPEG, PNG, WebP &middot; maksimal 5 foto</span>
                  </label>

                  <div class="event-upload-status" id="eventUploadStatus">
                    ${existing?.fotos?.length ?? 0} / 5 foto
                  </div>
                </div>

                <div
                  class="event-photo-grid"
                  id="eventPhotoPreview">
                </div>
              </section>

              <section class="event-form-section event-form-section-full">
                <div class="section-heading">
                  <span class="section-number">03</span>
                  <div>
                    <h3>Identitas Akun</h3>
                    <p>Otomatis mengikuti akun PKS yang sedang login.</p>
                  </div>
                </div>

                <div class="event-account-grid">
                  <div>
                    <span>Wilayah</span>
                    <strong>${escapeHtml(profile.wilayah)}</strong>
                  </div>

                  <div>
                    <span>Divisi / Tim</span>
                    <strong>${escapeHtml(profile.divisi)}</strong>
                  </div>

                  <div>
                    <span>Komsel</span>
                    <strong>${escapeHtml(profile.komsel)}</strong>
                  </div>

                  <div>
                    <span>Jabatan</span>
                    <strong>${escapeHtml(profile.jabatan)}</strong>
                  </div>
                </div>
              </section>
            </div>

            <div class="modal-footer event-editor-footer">
              <button
                class="cancel-login-button"
                type="button"
                id="cancelEventJemaat">
                Batal
              </button>

              <button
                class="primary-button"
                type="submit"
                id="saveEventJemaatButton">
                ${existing ? 'Simpan Perubahan' : 'Simpan Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  )

  let photoUrls = existing?.fotos ? [...existing.fotos] : []

  const photoInput =
    document.querySelector<HTMLInputElement>('#eventPhotos')

  const preview =
    document.querySelector<HTMLDivElement>('#eventPhotoPreview')

  const uploadStatus =
    document.querySelector<HTMLDivElement>('#eventUploadStatus')

  const submitButton =
    document.querySelector<HTMLButtonElement>('#saveEventJemaatButton')

  const renderPhotoPreview = () => {
    if (!preview) return

    preview.innerHTML = photoUrls.length
      ? photoUrls.map((url, index) => `
          <article class="event-photo-card">
            <img
              src="${escapeHtml(url)}"
              alt="Dokumentasi Event Jemaat ${index + 1}" />

            <button
              type="button"
              class="event-photo-remove"
              data-remove-event-photo="${index}"
              aria-label="Hapus foto">
              &times;
            </button>

            <span>Foto ${index + 1}</span>
          </article>
        `).join('')
      : `
          <div class="event-photo-empty">
            Belum ada foto dokumentasi.
          </div>
        `

    preview
      .querySelectorAll<HTMLButtonElement>(
        '[data-remove-event-photo]'
      )
      .forEach((button) => {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.removeEventPhoto)

          if (!Number.isInteger(index)) return

          photoUrls.splice(index, 1)
          renderPhotoPreview()
        })
      })

    if (uploadStatus) {
      uploadStatus.textContent = `${photoUrls.length} / 5 foto`
    }
  }

  renderPhotoPreview()

  photoInput?.addEventListener('change', async () => {
    const files = Array.from(photoInput.files ?? [])

    if (!files.length) return

    const availableSlots = 5 - photoUrls.length

    if (files.length > availableSlots) {
      alert(
        availableSlots > 0
          ? `Maksimal 5 foto. Anda masih dapat menambahkan ${availableSlots} foto.`
          : 'Maksimal 5 foto sudah tercapai.'
      )

      photoInput.value = ''
      return
    }

    photoInput.disabled = true

    if (submitButton) {
      submitButton.disabled = true
    }

    if (uploadStatus) {
      uploadStatus.textContent = 'Mengunggah foto ke Cloudinary...'
    }

    try {
      for (const file of files) {
        const secureUrl = await uploadEventPhoto(file)
        photoUrls.push(secureUrl)
        renderPhotoPreview()
      }
    } catch (error) {
      console.error('Gagal upload foto Event Jemaat:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Gagal mengunggah foto Event Jemaat.'
      )
    } finally {
      photoInput.disabled = false

      if (submitButton) {
        submitButton.disabled = false
      }

      photoInput.value = ''
      renderPhotoPreview()
    }
  })

  const closeModal = () => {
    document.querySelector('#eventJemaatModal')?.remove()
    editingEventId = null
  }

  document
    .querySelector('#closeEventJemaatModal')
    ?.addEventListener('click', closeModal)

  document
    .querySelector('#cancelEventJemaat')
    ?.addEventListener('click', closeModal)

  document
    .querySelector('#eventJemaatModal')
    ?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        closeModal()
      }
    })

  document
    .querySelector('#eventJemaatForm')
    ?.addEventListener('submit', async (event) => {
      event.preventDefault()

      const form = event.currentTarget as HTMLFormElement

      const nama = valueOf('eventNama').trim()
      const lokasi = valueOf('eventLokasi').trim()
      const tgl = valueOf('eventTanggal').trim()
      const isi = valueOf('eventIsi').trim()

      if (!nama || !lokasi || !tgl) {
        alert('Nama Kegiatan, Lokasi, dan Tanggal wajib diisi.')
        return
      }

      if (photoUrls.length > 5) {
        alert('Maksimal 5 foto per event.')
        return
      }

      const button =
        form.querySelector<HTMLButtonElement>(
          '#saveEventJemaatButton'
        )

      if (button) {
        button.disabled = true
        button.textContent = 'Menyimpan...'
      }

      try {
        if (editingEventId) {
          await updateEventJemaat(editingEventId, {
            nama,
            lokasi,
            tgl,
            isi,
            fotos: photoUrls,
          })
        } else {
          await saveEventJemaat({
            nama,
            lokasi,
            tgl,
            isi,
            fotos: photoUrls,
            createdBy: profile.nama,
            createdAt: new Date().toISOString(),
            wilayah: profile.wilayah,
            divisi: profile.divisi,
            komsel: profile.komsel,
            jabatan: profile.jabatan,
            ownerUid: profile.uid,
            ownerEmail: profile.email,
            ownerNama: profile.nama,
          })
        }

        closeModal()
        await loadEventsJemaat()
        renderEventJemaat()
      } catch (error) {
        console.error('Gagal menyimpan Event Jemaat:', error)

        if (button) {
          button.disabled = false
          button.textContent = existing
            ? 'Simpan Perubahan'
            : 'Simpan Event'
        }

        alert(
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan Event Jemaat.'
        )
      }
    })
}
function renderAgenda() {
  const rows = filteredAgendas()

  renderShell(`
    <main class="agenda-page">
      <section class="page-heading">
        <div>
          <p class="eyebrow">MODUL 01</p>

          <h1>Agenda Tahunan Terprogram</h1>

          <p>
            Satu template yang sama untuk Abepura, Sentani, Doyo,
            Arso 1, Arso 2, dan seluruh divisi/tim.
          </p>
        </div>

                <div class="page-heading-actions">
          <button
            class="secondary-button"
            type="button"
            id="backAgenda">
            &#8592;Â Kembali
          </button>

          <button
            class="primary-button"
            type="button"
            id="addAgenda">
            + Tambah Program
          </button>
        </div>
      </section>

      <section class="filter-panel">
        <div class="field">
          <label for="filterTahun">Tahun</label>
          <select id="filterTahun">
            ${optionList(years().map(String), filters.tahun, true)}
          </select>
        </div>

        <div class="filter-info">
          <strong>${rows.length} program</strong>
          <span>Data tersaring berdasarkan tahun yang dipilih.</span>
        </div>
      </section>

      <section class="template-note">
        <div>
          <strong>Template standar untuk seluruh wilayah & divisi</strong>

          <span>
            Periode - Bulan - Program Kerja - Tujuan Pelaksanaan -
            Sasaran/Target - Estimasi Pencapaian - Minggu I-IV -
            Keterangan - Kendala - Tindak Lanjut - Dokumentasi Foto
          </span>
        </div>

      </section>

      <section class="table-card">
        ${
          rows.length
            ? `
              <div class="table-toolbar">
  <div class="selection-actions">
    <label class="select-all-label">
      <input type="checkbox" id="selectAllAgendas">
      <span>Pilih Semua</span>
    </label>

    <button
      class="icon-button danger"
      type="button"
      id="deleteSelectedAgendas">
      Hapus Terpilih
    </button>
  </div>

  <span class="selection-info">
    ${selectedAgendaIds.size} program dipilih
  </span>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="selection-column">
          <input
            type="checkbox"
            id="selectAllAgendasHeader"
            aria-label="Pilih semua program">
        </th>
        <th>Wilayah</th>
                      <th>Divisi / Tim</th>
                      <th>Tahun</th>
                      <th>Periode</th>
                      <th>Bulan</th>
                      <th>Program Kerja</th>
                      <th>Tujuan Pelaksanaan</th>
                      <th>Sasaran / Target</th>
                      <th>Estimasi Pencapaian</th>
                      <th>Minggu I</th>
                      <th>Minggu II</th>
                      <th>Minggu III</th>
                      <th>Minggu IV</th>
                      <th>Keterangan</th>
                      <th>Kendala Pelaksanaan</th>
                      <th>Tindak Lanjut / Hasil</th>
                      <th>Dokumentasi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${rows.map((item) => `
                      <tr>
  <td class="selection-column">
    <input
      type="checkbox"
      class="agenda-select"
      data-select-agenda="${item.id}"
      ${selectedAgendaIds.has(item.id) ? 'checked' : ''}
      aria-label="Pilih ${escapeHtml(item.programKerja)}">
  </td>
  <td>${escapeHtml(item.wilayah)}</td>
                        <td>${escapeHtml(item.divisi)}</td>
                        <td>${item.tahun}</td>
                        <td>${escapeHtml(item.periode)}</td>
                        <td>${escapeHtml(item.bulan)}</td>

                        <td class="cell-long">
                          <strong>${escapeHtml(item.programKerja)}</strong>
                        </td>

                        <td class="cell-long">
                          ${escapeHtml(item.tujuanPelaksanaan)}
                        </td>

                        <td class="cell-long">
                          ${escapeHtml(item.sasaranTarget)}
                        </td>

                        <td class="cell-long">
                          ${escapeHtml(item.estimasiPencapaian)}
                        </td>

                        <td class="cell-week">${escapeHtml(item.mingguI)}</td>
                        <td class="cell-week">${escapeHtml(item.mingguII)}</td>
                        <td class="cell-week">${escapeHtml(item.mingguIII)}</td>
                        <td class="cell-week">${escapeHtml(item.mingguIV)}</td>

                        <td class="cell-long">
                          ${escapeHtml(item.keterangan)}
                        </td>

                        <td class="cell-long">
                          ${escapeHtml(item.kendalaPelaksanaan)}
                        </td>

                        <td class="cell-long">
                          ${escapeHtml(item.tindakLanjut)}
                        </td>

                        <td>
                          ${
                            item.photos.length
                              ? `<span class="photo-count">Foto: ${item.photos.length} foto</span>`
                              : `<span class="muted">Belum ada</span>`
                          }
                        </td>

                        <td>
                          <div class="row-actions">
                            <button
                              class="icon-button"
                              type="button"
                              data-edit="${item.id}">
                              Edit
                            </button>

                            <button
                              class="icon-button danger"
                              type="button"
                              data-delete="${item.id}">
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="empty-state">
                <div class="empty-icon">01</div>

                <h2>Belum ada program</h2>

                <p>
                  Tambahkan program kerja pertama menggunakan template
                  standar Agenda Tahunan Terprogram.
                </p>

                <button
                  class="primary-button"
                  type="button"
                  id="emptyAddAgenda">
                  + Tambah Program
                </button>
              </div>
            `
        }
      </section>

      <section class="export-panel">
        <div>
          <strong>Rekap & Export</strong>

          <span>
            Export data berdasarkan filter aktif ke CSV yang dapat
            dibuka di Microsoft Excel.
          </span>
        </div>

        <div class="export-actions">
          <button
            class="export-button export-pdf-button"
            type="button"
            id="exportPdf">
            Export PDF
          </button>

          <button
            class="export-button export-ppt-button"
            type="button"
            id="exportPpt">
            Export PPT
          </button>
        </div>
      </section>
    </main>
  `)

    document.querySelector('#backAgenda')?.addEventListener(
    'click',
    () => navigateTo('workspace')
  )

  document.querySelector('#addAgenda')?.addEventListener(
    'click',
    () => openAgendaForm()
  )

  document.querySelector('#emptyAddAgenda')?.addEventListener(
    'click',
    () => openAgendaForm()
  )


  document.querySelector('#exportPdf')?.addEventListener(
    'click',
    exportPdf
  )

  document.querySelector('#exportPpt')?.addEventListener(
    'click',
    exportPpt
  )

  document.querySelector('#exportCsv')?.addEventListener(
    'click',
    exportCsv
  )


  document.querySelector<HTMLSelectElement>('#filterTahun')?.addEventListener(
    'change',
    (event) => {
      filters.tahun = (event.target as HTMLSelectElement).value
      renderAgenda()
    }
  )

  const selectAllAgendas = document.querySelector<HTMLInputElement>('#selectAllAgendas')
  const selectAllAgendasHeader = document.querySelector<HTMLInputElement>('#selectAllAgendasHeader')
  const agendaCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('[data-select-agenda]')
  )

  const syncAgendaSelection = () => {
    const visibleIds = agendaCheckboxes.map(
      (checkbox) => checkbox.dataset.selectAgenda || ''
    ).filter(Boolean)

    const selectedVisibleCount = visibleIds.filter(
      (id) => selectedAgendaIds.has(id)
    ).length

    const allSelected =
      visibleIds.length > 0 &&
      selectedVisibleCount === visibleIds.length

    if (selectAllAgendas) {
      selectAllAgendas.checked = allSelected
      selectAllAgendas.indeterminate =
        selectedVisibleCount > 0 && !allSelected
    }

    if (selectAllAgendasHeader) {
      selectAllAgendasHeader.checked = allSelected
      selectAllAgendasHeader.indeterminate =
        selectedVisibleCount > 0 && !allSelected
    }

    const selectionInfo = document.querySelector<HTMLElement>('.selection-info')
    if (selectionInfo) {
      selectionInfo.textContent =
        `${selectedAgendaIds.size} program dipilih`
    }

    const deleteButton =
      document.querySelector<HTMLButtonElement>('#deleteSelectedAgendas')

    if (deleteButton) {
      deleteButton.disabled = selectedAgendaIds.size === 0
    }
  }

  const setVisibleAgendaSelection = (checked: boolean) => {
    agendaCheckboxes.forEach((checkbox) => {
      const id = checkbox.dataset.selectAgenda
      if (!id) return

      checkbox.checked = checked

      if (checked) {
        selectedAgendaIds.add(id)
      } else {
        selectedAgendaIds.delete(id)
      }
    })

    syncAgendaSelection()
  }

  selectAllAgendas?.addEventListener('change', (event) => {
    setVisibleAgendaSelection(
      (event.target as HTMLInputElement).checked
    )
  })

  selectAllAgendasHeader?.addEventListener('change', (event) => {
    setVisibleAgendaSelection(
      (event.target as HTMLInputElement).checked
    )
  })

  agendaCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const id = checkbox.dataset.selectAgenda
      if (!id) return

      if (checkbox.checked) {
        selectedAgendaIds.add(id)
      } else {
        selectedAgendaIds.delete(id)
      }

      syncAgendaSelection()
    })
  })

  document.querySelector<HTMLButtonElement>('#deleteSelectedAgendas')
    ?.addEventListener('click', deleteSelectedAgendas)

  syncAgendaSelection()
  document.querySelectorAll<HTMLElement>('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      openAgendaForm(button.dataset.edit)
    })
  })

  document.querySelectorAll<HTMLElement>('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      deleteAgenda(button.dataset.delete || '')
    })
  })
}

function openAgendaForm(id?: string) {
  editingId = id || null

  const existing = id
    ? agendas.find((item) => item.id === id)
    : undefined

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="agendaModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <div>
            <p class="eyebrow">TEMPLATE STANDAR</p>
            <h2>${existing ? 'Edit Program' : 'Tambah Program'}</h2>
          </div>

          <button
            class="close-button"
            type="button"
            id="closeAgendaModal"
            aria-label="Tutup">
            Tutup
          </button>
        </div>

        <form id="agendaForm">
          <div class="form-section">
            <h3>Identitas Agenda</h3>

            <div class="form-grid form-grid-3">
              <div class="field">
                <label for="formTahun">Tahun *</label>

                <input
                  id="formTahun"
                  type="number"
                  min="2000"
                  max="2100"
                  value="${existing?.tahun || new Date().getFullYear()}"
                  required />
              </div>

              <div class="field">
                <label for="formPeriode">Periode *</label>

                <select id="formPeriode" required>
                  ${optionList(
                    periode,
                    existing?.periode || periode[0]
                  )}
                </select>
              </div>

              <div class="field">
                <label for="formBulan">Bulan *</label>

                <select id="formBulan" required>
                  ${optionList(
                    bulan,
                    existing?.bulan || bulan[0]
                  )}
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Program Kerja</h3>

            <div class="form-grid form-grid-2">
              <div class="field">
                <label for="programKerja">Program Kerja *</label>

                <textarea
                  id="programKerja"
                  rows="3"
                  required>${escapeHtml(existing?.programKerja || '')}</textarea>
              </div>

              <div class="field">
                <label for="tujuanPelaksanaan">
                  Tujuan Pelaksanaan *
                </label>

                <textarea
                  id="tujuanPelaksanaan"
                  rows="3"
                  required>${escapeHtml(existing?.tujuanPelaksanaan || '')}</textarea>
              </div>

              <div class="field">
                <label for="sasaranTarget">
                  Sasaran / Target *
                </label>

                <textarea
                  id="sasaranTarget"
                  rows="3"
                  required>${escapeHtml(existing?.sasaranTarget || '')}</textarea>
              </div>

              <div class="field">
                <label for="estimasiPencapaian">
                  Estimasi Pencapaian
                </label>

                <textarea
                  id="estimasiPencapaian"
                  rows="3">${escapeHtml(existing?.estimasiPencapaian || '')}</textarea>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Minggu Pelaksanaan</h3>

            <div class="form-grid form-grid-4">
              <div class="field">
                <label for="mingguI">Minggu I</label>
                <textarea id="mingguI" rows="3">${escapeHtml(existing?.mingguI || '')}</textarea>
              </div>

              <div class="field">
                <label for="mingguII">Minggu II</label>
                <textarea id="mingguII" rows="3">${escapeHtml(existing?.mingguII || '')}</textarea>
              </div>

              <div class="field">
                <label for="mingguIII">Minggu III</label>
                <textarea id="mingguIII" rows="3">${escapeHtml(existing?.mingguIII || '')}</textarea>
              </div>

              <div class="field">
                <label for="mingguIV">Minggu IV</label>
                <textarea id="mingguIV" rows="3">${escapeHtml(existing?.mingguIV || '')}</textarea>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Pelaksanaan & Evaluasi</h3>

            <div class="form-grid form-grid-3">
              <div class="field">
                <label for="keterangan">Keterangan</label>
                <textarea id="keterangan" rows="3">${escapeHtml(existing?.keterangan || '')}</textarea>
              </div>

              <div class="field">
                <label for="kendalaPelaksanaan">
                  Kendala Pelaksanaan
                </label>
                <textarea id="kendalaPelaksanaan" rows="3">${escapeHtml(existing?.kendalaPelaksanaan || '')}</textarea>
              </div>

              <div class="field">
                <label for="tindakLanjut">
                  Tindak Lanjut / Hasil Pelaksanaan
                </label>
                <textarea id="tindakLanjut" rows="3">${escapeHtml(existing?.tindakLanjut || '')}</textarea>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-heading-row">
              <div>
                <h3>Dokumentasi Foto</h3>
                <p>
                  Upload foto kegiatan yang terkait dengan program ini.
                </p>
              </div>

              <label class="upload-button">
                + Upload Foto

                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  hidden />
              </label>
            </div>

            <div
              class="photo-grid"
              id="photoPreview">
            </div>
          </div>

                    <div class="modal-footer">
            <button
              class="secondary-button"
              id="cancelAgenda"
              type="button">
              Batal
            </button>

            <button
              class="primary-button"
              type="submit">
              Simpan Program
            </button>
          </div>
        </form>
      </div>
    </div>
  `)

  let photos: PhotoData[] = existing?.photos
    ? [...existing.photos]
    : []

  const renderPhotos = () => {
    const preview = document.querySelector<HTMLDivElement>('#photoPreview')!

    preview.innerHTML = photos.length
      ? photos.map((photo) => `
          <div class="photo-item">
            <img
              src="${photo.dataUrl}"
              alt="${escapeHtml(photo.name)}" />

            <div class="photo-caption">
              <span>${escapeHtml(photo.name)}</span>

              <button
                type="button"
                data-remove-photo="${photo.id}">
                Hapus
              </button>
            </div>
          </div>
        `).join('')
      : `<div class="photo-empty">Belum ada foto dokumentasi.</div>`

    preview.querySelectorAll<HTMLElement>(
      '[data-remove-photo]'
    ).forEach((button) => {
      button.addEventListener('click', () => {
        photos = photos.filter(
          (photo) => photo.id !== button.dataset.removePhoto
        )

        renderPhotos()
      })
    })
  }

  renderPhotos()

  document.querySelector('#closeAgendaModal')?.addEventListener(
    'click',
    closeAgendaModal
  )

  document.querySelector('#cancelAgenda')?.addEventListener(
    'click',
    closeAgendaModal
  )

  document.querySelector('#agendaModal')?.addEventListener(
    'click',
    (event) => {
      if (event.target === event.currentTarget) {
        closeAgendaModal()
      }
    }
  )

  document.querySelector<HTMLInputElement>('#photos')?.addEventListener(
    'change',
    async (event) => {
      const input = event.target as HTMLInputElement

      for (const file of Array.from(input.files || [])) {
        try {
          photos.push({
            id: uid('photo'),
            name: file.name,
            dataUrl: await uploadEventPhoto(file),
          })
        } catch {
          alert(`Foto "${file.name}" tidak dapat diproses.`)
        }
      }

      input.value = ''
      renderPhotos()
    }
  )

  document.querySelector<HTMLFormElement>('#agendaForm')?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault()

      const profile = getDemoPksSession()

      if (!profile) {
        alert('Sesi PKS tidak ditemukan. Silakan login kembali.')
        return
      }

      const item: AgendaItem = {
        id: editingId || uid('agenda'),
        wilayah: profile.wilayah,
        divisi: profile.divisi,
        tahun: Number(valueOf('formTahun')),
        periode: valueOf('formPeriode'),
        bulan: valueOf('formBulan'),
        programKerja: valueOf('programKerja'),
        tujuanPelaksanaan: valueOf('tujuanPelaksanaan'),
        sasaranTarget: valueOf('sasaranTarget'),
        estimasiPencapaian: valueOf('estimasiPencapaian'),
        mingguI: valueOf('mingguI'),
        mingguII: valueOf('mingguII'),
        mingguIII: valueOf('mingguIII'),
        mingguIV: valueOf('mingguIV'),
        keterangan: valueOf('keterangan'),
        kendalaPelaksanaan: valueOf('kendalaPelaksanaan'),
        tindakLanjut: valueOf('tindakLanjut'),
        photos,
      }

      const index = agendas.findIndex(
        (agenda) => agenda.id === item.id
      )

      if (index >= 0) {
        agendas[index] = item
      } else {
        agendas.push(item)
      }

      await saveAgendaToSupabase(item)

      filters.tahun = String(item.tahun)

      closeAgendaModal()
      renderAgenda()
    }
  )
}

function valueOf(id: string) {
  return (
    document.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(`#${id}`)?.value.trim() || ''
  )
}

function closeAgendaModal() {
  document.querySelector('#agendaModal')?.remove()
  editingId = null
}

async function deleteAgenda(id: string) {
  const confirmed = window.confirm('Apakah anda ingin menghapus data tersebut ?')

  if (!confirmed) return

  try {
    await deleteAgendaFromSupabase(id)
    agendas = agendas.filter((item) => item.id !== id)
    renderAgenda()
  } catch (error) {
    console.error('Gagal menghapus agenda:', error)
    alert('Agenda gagal dihapus.')
  }
}

async function deleteSelectedAgendas() {
  if (selectedAgendaIds.size === 0) return

  const confirmed = window.confirm('Apakah anda ingin menghapus data tersebut ?')

  if (!confirmed) return

  const ids = Array.from(selectedAgendaIds)

  try {
    await Promise.all(ids.map((id) => deleteAgendaFromSupabase(id)))

    agendas = agendas.filter((item) => !selectedAgendaIds.has(item.id))
    selectedAgendaIds.clear()
    renderAgenda()
  } catch (error) {
    console.error('Gagal menghapus agenda terpilih:', error)
    alert('Sebagian agenda gagal dihapus.')
  }
}

async function exportPpt() {
  const rows = filteredAgendas()

  if (!rows.length) {
    alert('Tidak ada data untuk diexport.')
    return
  }

  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()

  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'SIPAPUA Portal PKS'
  pptx.subject = 'Agenda Tahunan Terprogram'
  pptx.title = 'Agenda Tahunan Terprogram'
  pptx.company = 'Pondok Pemulihan Papua'
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  }

  const GREEN = '06382F'
  const GREEN_LIGHT = 'E6F1ED'
  const GOLD = 'C48B18'
  const TEXT = '315F55'
  const MUTED = '718981'

  const tahunLabel =
    filters.tahun === 'all' ? 'Semua Tahun' : filters.tahun

  const addFooter = (slide: any, page: number) => {
    slide.addText('SIPAPUA Portal PKS', {
      x: 0.45,
      y: 7.15,
      w: 3,
      h: 0.2,
      fontFace: 'Aptos',
      fontSize: 8,
      color: MUTED,
      margin: 0,
    })

    slide.addText(String(page), {
      x: 12.25,
      y: 7.15,
      w: 0.6,
      h: 0.2,
      fontFace: 'Aptos',
      fontSize: 8,
      color: MUTED,
      align: 'right',
      margin: 0,
    })
  }

  let page = 1

  {
    const slide = pptx.addSlide()

    slide.background = {
      color: 'F3F7F5',
    }

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 1.25,
      fill: { color: GREEN },
      line: { color: GREEN },
    })

    slide.addText('SIPAPUA', {
      x: 0.65,
      y: 0.32,
      w: 3,
      h: 0.45,
      fontSize: 24,
      bold: true,
      color: 'FFFFFF',
      margin: 0,
    })

    slide.addText('AGENDA TAHUNAN TERPROGRAM', {
      x: 0.8,
      y: 2.15,
      w: 11.7,
      h: 0.7,
      fontSize: 30,
      bold: true,
      color: GREEN,
      align: 'center',
      margin: 0,
    })

    slide.addText('Portal PKS / Pemimpin Pondok Pemulihan Papua', {
      x: 1.2,
      y: 3.0,
      w: 10.9,
      h: 0.35,
      fontSize: 15,
      color: TEXT,
      align: 'center',
      margin: 0,
    })

    slide.addShape(pptx.ShapeType.line, {
      x: 4.1,
      y: 3.65,
      w: 5.1,
      h: 0,
      line: { color: GOLD, width: 2 },
    })

    slide.addText([
      { text: 'Tahun  ', options: { bold: true, color: GREEN } },
      { text: tahunLabel },
    ], {
      x: 3.65,
      y: 4.15,
      w: 6.1,
      h: 1.25,
      fontSize: 15,
      color: TEXT,
      align: 'center',
      breakLine: false,
      margin: 0.05,
      valign: 'middle',
    })

    addFooter(slide, page++)
  }

  {
    const slide = pptx.addSlide()

    slide.background = {
      color: 'FFFFFF',
    }

    slide.addText('RINGKASAN AGENDA', {
      x: 0.65,
      y: 0.45,
      w: 5.5,
      h: 0.45,
      fontSize: 24,
      bold: true,
      color: GREEN,
      margin: 0,
    })


    slide.addText(`Tahun: ${tahunLabel}`, {
      x: 0.65,
      y: 1.55,
      w: 5.8,
      h: 0.3,
      fontSize: 12,
      color: TEXT,
      margin: 0,
    })

    slide.addText(`Tahun: ${tahunLabel}`, {
      x: 0.65,
      y: 1.95,
      w: 5.8,
      h: 0.3,
      fontSize: 12,
      color: TEXT,
      margin: 0,
    })

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.75,
      y: 2.8,
      w: 3.0,
      h: 1.6,
      rectRadius: 0.08,
      fill: { color: GREEN_LIGHT },
      line: { color: GREEN_LIGHT },
    })

    slide.addText(String(rows.length), {
      x: 1.0,
      y: 3.0,
      w: 2.5,
      h: 0.55,
      fontSize: 30,
      bold: true,
      color: GREEN,
      align: 'center',
      margin: 0,
    })

    slide.addText('TOTAL PROGRAM', {
      x: 1.0,
      y: 3.65,
      w: 2.5,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: MUTED,
      align: 'center',
      margin: 0,
    })

    const periodSummary = rows.reduce<Record<string, number>>((acc, item) => {
      acc[item.periode] = (acc[item.periode] || 0) + 1
      return acc
    }, {})

    const summaryRows = Object.entries(periodSummary)

    slide.addText('PROGRAM PER PERIODE', {
      x: 5.1,
      y: 2.55,
      w: 3.8,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: GREEN,
      margin: 0,
    })

    summaryRows.forEach(([periodName, count], index) => {
      const y = 3.0 + index * 0.65

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.1,
        y,
        w: 0.42,
        h: 0.42,
        rectRadius: 0.04,
        fill: { color: GOLD },
        line: { color: GOLD },
      })

      slide.addText(String(count), {
        x: 5.1,
        y: y + 0.07,
        w: 0.42,
        h: 0.2,
        fontSize: 9,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        margin: 0,
      })

      slide.addText(periodName, {
        x: 5.75,
        y: y + 0.04,
        w: 3.8,
        h: 0.25,
        fontSize: 12,
        color: TEXT,
        margin: 0,
      })
    })

    addFooter(slide, page++)
  }

  rows.forEach((item, index) => {
    const slide = pptx.addSlide()

    slide.background = {
      color: 'FFFFFF',
    }

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.85,
      fill: { color: GREEN },
      line: { color: GREEN },
    })

    slide.addText(
      `${String(index + 1).padStart(2, '0')}  ${item.programKerja}`,
      {
        x: 0.55,
        y: 0.24,
        w: 12.1,
        h: 0.32,
        fontSize: 18,
        bold: true,
        color: 'FFFFFF',
        margin: 0,
        fit: 'shrink',
      }
    )

    slide.addText(
      `${item.wilayah} - ${item.divisi} - ${item.tahun} - ${item.bulan}`,
      {
        x: 0.65,
        y: 1.15,
        w: 12,
        h: 0.25,
        fontSize: 10,
        color: MUTED,
        margin: 0,
      }
    )

    const detailRows = [
      ['Periode', item.periode],
      ['Tujuan Pelaksanaan', item.tujuanPelaksanaan],
      ['Sasaran / Target', item.sasaranTarget],
      ['Estimasi Pencapaian', item.estimasiPencapaian || '-'],
      ['Minggu I', item.mingguI || '-'],
      ['Minggu II', item.mingguII || '-'],
      ['Minggu III', item.mingguIII || '-'],
      ['Minggu IV', item.mingguIV || '-'],
      ['Keterangan', item.keterangan || '-'],
      ['Kendala Pelaksanaan', item.kendalaPelaksanaan || '-'],
      ['Tindak Lanjut / Hasil', item.tindakLanjut || '-'],
    ]

    const tableData = detailRows.map(([label, value]) => [
      { text: label },
      { text: value },
    ])
    slide.addTable(tableData, {
      x: 0.65,
      y: 1.65,
      w: 12.0,
      h: 4.65,
      border: {
        type: 'solid',
        pt: 0.5,
        color: 'D8E4DF',
      },
      fontFace: 'Aptos',
      fontSize: 9,
      color: TEXT,
      margin: 0.07,
      valign: 'top',
      rowH: 0.42,
      fill: { color: 'FFFFFF' },
      colW: [2.05, 9.95],
      bold: false,
      breakLine: false,
    })

    slide.addText('Dokumentasi', {
      x: 0.65,
      y: 6.45,
      w: 2,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: GREEN,
      margin: 0,
    })

    slide.addText(
      item.photos.length
        ? `${item.photos.length} foto`
        : 'Belum ada dokumentasi foto',
      {
        x: 2.25,
        y: 6.45,
        w: 4.5,
        h: 0.25,
        fontSize: 10,
        color: MUTED,
        margin: 0,
      }
    )

    addFooter(slide, page++)

    if (item.photos.length) {
      const photoSlide = pptx.addSlide()

      photoSlide.background = {
        color: 'F3F7F5',
      }

      photoSlide.addText('DOKUMENTASI KEGIATAN', {
        x: 0.65,
        y: 0.45,
        w: 7,
        h: 0.4,
        fontSize: 22,
        bold: true,
        color: GREEN,
        margin: 0,
      })

      photoSlide.addText(item.programKerja, {
        x: 0.65,
        y: 1.0,
        w: 11.8,
        h: 0.3,
        fontSize: 11,
        color: TEXT,
        margin: 0,
        fit: 'shrink',
      })

      const photos = item.photos.slice(0, 4)

      photos.forEach((photo, photoIndex) => {
        const column = photoIndex % 2
        const row = Math.floor(photoIndex / 2)

        photoSlide.addImage({
          data: photo.dataUrl,
          x: 0.65 + column * 6.15,
          y: 1.55 + row * 2.55,
          w: 5.75,
          h: 2.15,
        })

        photoSlide.addText(photo.name, {
          x: 0.75 + column * 6.15,
          y: 3.78 + row * 2.55,
          w: 5.55,
          h: 0.2,
          fontSize: 7,
          color: MUTED,
          align: 'center',
          margin: 0,
          fit: 'shrink',
        })
      })

      if (item.photos.length > 4) {
        photoSlide.addText(
          `+ ${item.photos.length - 4} foto lainnya`,
          {
            x: 9.2,
            y: 6.4,
            w: 3,
            h: 0.25,
            fontSize: 9,
            bold: true,
            color: GREEN,
            align: 'right',
            margin: 0,
          }
        )
      }

      addFooter(photoSlide, page++)
    }
  })

  pptx.writeFile({
    fileName:
      `agenda-tahunan-terprogram-${new Date().toISOString().slice(0, 10)}.pptx`,
  })
}
function exportPdf() {
  const rows = filteredAgendas()

  if (!rows.length) {
    alert('Tidak ada data untuk diexport.')
    return
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const tahunLabel = filters.tahun === 'all'
    ? 'Semua Tahun'
    : filters.tahun

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('AGENDA TAHUNAN TERPROGRAM', 14, 15)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    `Tahun: ${tahunLabel}`,
    14,
    22,
  )

  pdf.text(
    `Jumlah Program: ${rows.length}`,
    14,
    28,
  )

  autoTable(pdf, {
    startY: 34,
    head: [[
      'Wilayah',
      'Divisi / Tim',
      'Tahun',
      'Periode',
      'Bulan',
      'Program Kerja',
      'Tujuan Pelaksanaan',
      'Sasaran / Target',
      'Estimasi',
      'Minggu I',
      'Minggu II',
      'Minggu III',
      'Minggu IV',
      'Keterangan',
      'Kendala',
      'Tindak Lanjut / Hasil',
      'Dokumentasi',
    ]],
    body: rows.map((item) => [
      item.wilayah,
      item.divisi,
      String(item.tahun),
      item.periode,
      item.bulan,
      item.programKerja,
      item.tujuanPelaksanaan,
      item.sasaranTarget,
      item.estimasiPencapaian,
      item.mingguI,
      item.mingguII,
      item.mingguIII,
      item.mingguIV,
      item.keterangan,
      item.kendalaPelaksanaan,
      item.tindakLanjut,
      item.photos.length ? `${item.photos.length} foto` : '-',
    ]),
    styles: {
      fontSize: 6,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fontSize: 6,
      fontStyle: 'bold',
    },
    margin: {
      top: 34,
      right: 8,
      bottom: 10,
      left: 8,
    },
    didDrawPage: (data) => {
      const pageCount = pdf.getNumberOfPages()

      pdf.setFontSize(7)
      pdf.text(
        `SIPAPUA Portal PKS`,
        8,
        pdf.internal.pageSize.getHeight() - 5,
      )

      pdf.text(
        `Halaman ${data.pageNumber} / ${pageCount}`,
        pdf.internal.pageSize.getWidth() - 30,
        pdf.internal.pageSize.getHeight() - 5,
      )
    },
  })

  const fileName =
    `agenda-tahunan-terprogram-${new Date().toISOString().slice(0, 10)}.pdf`

  pdf.save(fileName)
}
function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function exportCsv() {
  const rows = filteredAgendas()

  if (!rows.length) {
    alert('Tidak ada data untuk diexport.')
    return
  }

  const header = [
    'Wilayah',
    'Divisi / Tim',
    'Tahun',
    'Periode',
    'Bulan',
    'Program Kerja',
    'Tujuan Pelaksanaan',
    'Sasaran / Target',
    'Estimasi Pencapaian',
    'Minggu I',
    'Minggu II',
    'Minggu III',
    'Minggu IV',
    'Keterangan',
    'Kendala Pelaksanaan',
    'Tindak Lanjut / Hasil Pelaksanaan',
    'Jumlah Dokumentasi Foto',
  ]

  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((item) => [
      item.wilayah,
      item.divisi,
      item.tahun,
      item.periode,
      item.bulan,
      item.programKerja,
      item.tujuanPelaksanaan,
      item.sasaranTarget,
      item.estimasiPencapaian,
      item.mingguI,
      item.mingguII,
      item.mingguIII,
      item.mingguIV,
      item.keterangan,
      item.kendalaPelaksanaan,
      item.tindakLanjut,
      item.photos.length,
    ].map(csvCell).join(',')),
  ]

  const blob = new Blob(
    ['\ufeff' + lines.join('\r\n')],
    {
      type: 'text/csv;charset=utf-8;',
    }
  )

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download =
    `agenda-tahunan-terprogram-${new Date().toISOString().slice(0, 10)}.csv`

  anchor.click()

  URL.revokeObjectURL(url)
}

function navigateTo(route:string) {
  const normalized=route.replace(/^#/, '') || 'dashboard'
  window.location.hash=normalized
}

function requirePksSession():boolean {
  if (getDemoPksSession()) return true

  navigateTo('dashboard')
  setTimeout(() => openPksLogin(), 0)
  return false
}

function handleRoute() {
  const route=(window.location.hash || '#dashboard').replace(/^#/, '')

  if (route === 'workspace') {
    if (!requirePksSession()) return
    renderPksWorkspace()
    return
  }

  if (route === 'event-jemaat') {
    if (!requirePksSession()) return

    loadEventsJemaat().finally(() => {
      renderEventJemaat()
    })

    return
  }

  if (route === 'agenda') {
    if (!requirePksSession()) return

    loadAgendasFromSupabase().finally(() => {
      renderAgenda()
    })

    return
  }


  if (route === 'annual-report') {
    if (!requirePksSession()) return

    loadAnnualActivitiesFromSupabase().finally(() => {
      renderAnnualActivity()
    })

    return
  }

  if (route === 'dashboard') {
    renderDashboard()
    return
  }

  navigateTo('dashboard')
}

window.addEventListener('hashchange', handleRoute)

if (!window.location.hash) {
  navigateTo('dashboard')
} else {
  handleRoute()
}
