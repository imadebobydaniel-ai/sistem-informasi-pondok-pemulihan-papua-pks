import './style.css'
import logoIbn from './assets/logo-ibn.png'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loginDemoPks } from './demoAuth'

type PhotoData = {
  id: string
  name: string
  dataUrl: string
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

const wilayah = ['Abepura', 'Sentani', 'Doyo', 'Arso 1', 'Arso 2']

const divisi = [
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

const STORAGE_KEY = 'sipapua-pks-agenda-terprogram-v1'
const DIVISION_KEY = 'sipapua-pks-divisions-v1'

let agendas: AgendaItem[] = loadAgendas()
let divisions: string[] = loadDivisions()
let editingId: string | null = null

const filters = {
  wilayah: 'all',
  divisi: 'all',
  tahun: 'all',
}

function loadAgendas(): AgendaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as AgendaItem[] : []
  } catch {
    return []
  }
}

function saveAgendas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agendas))
}

function loadDivisions(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(DIVISION_KEY) || '[]') as string[]
    return Array.from(new Set([...divisi, ...stored]))
  } catch {
    return [...divisi]
  }
}

function saveDivisions() {
  localStorage.setItem(DIVISION_KEY, JSON.stringify(divisions))
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
  const set = new Set<number>([new Date().getFullYear()])
  agendas.forEach((item) => set.add(item.tahun))
  return [...set].sort((a, b) => b - a)
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
    .filter((item) => filters.wilayah === 'all' || item.wilayah === filters.wilayah)
    .filter((item) => filters.divisi === 'all' || item.divisi === filters.divisi)
    .filter((item) => filters.tahun === 'all' || String(item.tahun) === filters.tahun)
    .sort((a, b) => {
      if (a.tahun !== b.tahun) return b.tahun - a.tahun

      const monthDiff = bulan.indexOf(a.bulan) - bulan.indexOf(b.bulan)
      if (monthDiff !== 0) return monthDiff

      return a.programKerja.localeCompare(b.programKerja)
    })
}

function renderShell(content: string, showBackButton = false) {
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
          ${showBackButton ? `
            <button
              class="back-dashboard-button"
              type="button"
              id="backDashboard">
              â† Kembali ke Portal Utama
            </button>
          ` : ''}

          <button
            class="login-button"
            type="button"
            id="loginButton">
            Login PKS
          </button>
        </div>
      </header>

      ${content}

      <footer class="site-footer">
        <span>SIPAPUA Portal PKS</span>
        <span>Â© 2026 Pondok Pemulihan Papua</span>
      </footer>
    </div>
  `

  document.querySelector('#loginButton')?.addEventListener('click', () => {
    openPksLogin()
  })

  if (showBackButton) {
    document.querySelector('#backDashboard')?.addEventListener('click', renderDashboard)
  }
}

function openPksLogin() {
  if (document.querySelector('#pksLoginModal')) return

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="pksLoginModal">
      <div class="modal" style="max-width:460px;">
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
            Ã—
          </button>
        </div>

        <form id="pksLoginForm" style="padding:20px;">
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
                <button class="password-toggle" type="button" id="togglePksPassword" aria-label="Tampilkan password">👁</button>
              </div>
            </div>

            <div
              id="loginError"
              style="display:none;margin-top:12px;padding:10px 12px;border-radius:8px;background:#fff1f0;color:#a33d38;font-size:12px;">
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
      toggle.textContent = '🙈'
      toggle.setAttribute('aria-label', 'Sembunyikan password')
    } else {
      input.type = 'password'
      toggle.textContent = '👁'
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
        '<button class="close-button" type="button" id="closeModuleInfo" aria-label="Tutup">Ã—</button>' +
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

        <article class="module-card" id="openAnnualReport">
          <div class="module-icon">03</div>
          <h2>Laporan Tahunan</h2>

          <p>
            Modul untuk menyusun, memantau, dan menyiapkan laporan tahunan berdasarkan pelaksanaan program kerja, hasil kegiatan, kendala, tindak lanjut, serta dokumentasi yang telah dikumpulkan.
          </p>

          <span class="module-link">Baca</span>
        </article>
      </section>
    </main>
  `)

  document.querySelector('#openAgenda')?.addEventListener('click', () => openModuleInfo('Agenda Tahunan Terprogram', 'Modul ini digunakan untuk mengelola program kerja tahunan berdasarkan wilayah dan divisi, termasuk jadwal, target, kendala, tindak lanjut, dan dokumentasi foto.', 'Akses modul tersedia setelah Login PKS.'))

  document.querySelector('#openEventBase')?.addEventListener('click', () => openModuleInfo('Agenda Event Base', 'Modul ini disiapkan untuk pengelolaan kegiatan khusus berbasis event. Fitur lengkapnya akan tersedia pada workspace internal PKS.', 'Segera tersedia â€” Login PKS diperlukan untuk akses internal.'))

  document.querySelector('#openAnnualReport')?.addEventListener('click', () => openModuleInfo('Laporan Tahunan', 'Modul ini digunakan untuk mengelola dan memantau laporan tahunan kegiatan jemaat berdasarkan data program kerja yang dikelola PKS.', 'Akses modul tersedia setelah Login PKS.'))
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

        <button
          class="primary-button"
          type="button"
          id="addAgenda">
          + Tambah Program
        </button>
      </section>

      <section class="filter-panel">
        <div class="field">
          <label for="filterWilayah">Wilayah</label>

          <select id="filterWilayah">
            ${optionList(wilayah, filters.wilayah, true)}
          </select>
        </div>

        <div class="field">
          <label for="filterDivisi">Divisi / Tim</label>

          <select id="filterDivisi">
            ${optionList(divisions, filters.divisi, true)}
          </select>
        </div>

        <div class="field">
          <label for="filterTahun">Tahun</label>

          <select id="filterTahun">
            ${optionList(years().map(String), filters.tahun, true)}
          </select>
        </div>

        <div class="filter-info">
          <strong>${rows.length} program</strong>
          <span>Data tersaring sesuai filter aktif.</span>
        </div>
      </section>

      <section class="template-note">
        <div>
          <strong>Template standar untuk seluruh wilayah & divisi</strong>

          <span>
            Periode Â· Bulan Â· Program Kerja Â· Tujuan Pelaksanaan Â·
            Sasaran/Target Â· Estimasi Pencapaian Â· Minggu Iâ€“IV Â·
            Keterangan Â· Kendala Â· Tindak Lanjut Â· Dokumentasi Foto
          </span>
        </div>

        <button
          class="secondary-button"
          type="button"
          id="manageDivisions">
          Kelola Divisi / Tim
        </button>
      </section>

      <section class="table-card">
        ${
          rows.length
            ? `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
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
                              ? `<span class="photo-count">ðŸ“· ${item.photos.length} foto</span>`
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
            ðŸ“„ Export PDF
          </button>

          <button
            class="export-button export-ppt-button"
            type="button"
            id="exportPpt">
            ðŸ“Š Export PPT
          </button>
        </div>
      </section>
    </main>
  `, true)

  document.querySelector('#addAgenda')?.addEventListener(
    'click',
    () => openAgendaForm()
  )

  document.querySelector('#emptyAddAgenda')?.addEventListener(
    'click',
    () => openAgendaForm()
  )

  document.querySelector('#manageDivisions')?.addEventListener(
    'click',
    manageDivisions
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

  document.querySelector<HTMLSelectElement>('#filterWilayah')?.addEventListener(
    'change',
    (event) => {
      filters.wilayah = (event.target as HTMLSelectElement).value
      renderAgenda()
    }
  )

  document.querySelector<HTMLSelectElement>('#filterDivisi')?.addEventListener(
    'change',
    (event) => {
      filters.divisi = (event.target as HTMLSelectElement).value
      renderAgenda()
    }
  )

  document.querySelector<HTMLSelectElement>('#filterTahun')?.addEventListener(
    'change',
    (event) => {
      filters.tahun = (event.target as HTMLSelectElement).value
      renderAgenda()
    }
  )

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
            Ã—
          </button>
        </div>

        <form id="agendaForm">
          <div class="form-section">
            <h3>Identitas Agenda</h3>

            <div class="form-grid form-grid-3">
              <div class="field">
                <label for="formWilayah">Wilayah *</label>

                <select id="formWilayah" required>
                  ${optionList(
                    wilayah,
                    existing?.wilayah || wilayah[0]
                  )}
                </select>
              </div>

              <div class="field">
                <label for="formDivisi">Divisi / Tim *</label>

                <select id="formDivisi" required>
                  ${optionList(
                    divisions,
                    existing?.divisi || divisions[0]
                  )}
                </select>
              </div>

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
              type="button"
              id="cancelAgenda">
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
            dataUrl: await compressImage(file),
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
    (event) => {
      event.preventDefault()

      const item: AgendaItem = {
        id: editingId || uid('agenda'),
        wilayah: valueOf('formWilayah'),
        divisi: valueOf('formDivisi'),
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

      saveAgendas()

      filters.wilayah = item.wilayah
      filters.divisi = item.divisi
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

function deleteAgenda(id: string) {
  const item = agendas.find((agenda) => agenda.id === id)

  if (!item) return

  const confirmed = confirm(
    `Hapus program "${item.programKerja}" beserta dokumentasinya?`
  )

  if (!confirmed) return

  agendas = agendas.filter((agenda) => agenda.id !== id)
  saveAgendas()
  renderAgenda()
}

function manageDivisions() {
  const value = prompt(
    'Masukkan daftar Divisi / Tim, satu nama per baris:',
    divisions.join('\n')
  )

  if (value === null) return

  const next = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!next.length) {
    alert('Minimal harus ada satu Divisi / Tim.')
    return
  }

  divisions = Array.from(new Set(next))
  saveDivisions()

  if (
    filters.divisi !== 'all' &&
    !divisions.includes(filters.divisi)
  ) {
    filters.divisi = 'all'
  }

  renderAgenda()
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('file-read-error'))

    reader.onload = () => {
      const image = new Image()

      image.onerror = () => reject(new Error('image-load-error'))

      image.onload = () => {
        const maxSize = 1600

        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        )

        const width = Math.max(
          1,
          Math.round(image.width * scale)
        )

        const height = Math.max(
          1,
          Math.round(image.height * scale)
        )

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')

        if (!context) {
          reject(new Error('canvas-error'))
          return
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        )

        resolve(
          canvas.toDataURL(
            'image/jpeg',
            0.78
          )
        )
      }

      image.src = String(reader.result)
    }

    reader.readAsDataURL(file)
  })
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

  const wilayahLabel =
    filters.wilayah === 'all' ? 'Semua Wilayah' : filters.wilayah

  const divisiLabel =
    filters.divisi === 'all' ? 'Semua Divisi / Tim' : filters.divisi

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
      { text: 'Wilayah  ', options: { bold: true, color: GREEN } },
      { text: wilayahLabel },
      { text: '\nDivisi / Tim  ', options: { bold: true, color: GREEN } },
      { text: divisiLabel },
      { text: '\nTahun  ', options: { bold: true, color: GREEN } },
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

    slide.addText(`Wilayah: ${wilayahLabel}`, {
      x: 0.65,
      y: 1.15,
      w: 5.8,
      h: 0.3,
      fontSize: 12,
      color: TEXT,
      margin: 0,
    })

    slide.addText(`Divisi / Tim: ${divisiLabel}`, {
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
      `${item.wilayah}  Â·  ${item.divisi}  Â·  ${item.tahun}  Â·  ${item.bulan}`,
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

  const wilayahLabel = filters.wilayah === 'all'
    ? 'Semua Wilayah'
    : filters.wilayah

  const divisiLabel = filters.divisi === 'all'
    ? 'Semua Divisi / Tim'
    : filters.divisi

  const tahunLabel = filters.tahun === 'all'
    ? 'Semua Tahun'
    : filters.tahun

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('AGENDA TAHUNAN TERPROGRAM', 14, 15)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    `Wilayah: ${wilayahLabel} | Divisi / Tim: ${divisiLabel} | Tahun: ${tahunLabel}`,
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

renderDashboard()