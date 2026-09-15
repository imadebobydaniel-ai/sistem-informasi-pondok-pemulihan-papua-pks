import { supabase } from './supabase'
import type { DemoPksProfile } from './demoAuth'

export type SupabaseAnnualReport = {
  id: string
  owner_id: string
  wilayah: string
  divisi: string
  tahun: number
  periode: string
  bulan: string
  program_kerja: string
  hasil_pelaksanaan: string
  sasaran_target: string | null
  estimasi_pencapaian: string | null
  kendala_pelaksanaan: string | null
  tindak_lanjut: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SupabaseAnnualReportPhoto = {
  id: string
  report_id: string
  url: string
  caption: string | null
  sort_order: number
}

const reportSelect =
  'id,owner_id,wilayah,divisi,tahun,periode,bulan,program_kerja,hasil_pelaksanaan,sasaran_target,estimasi_pencapaian,kendala_pelaksanaan,tindak_lanjut,status,created_at,updated_at,deleted_at'

export async function listMyAnnualReports(profile: DemoPksProfile) {
  const { data: reports, error: reportError } = await supabase
    .from('annual_reports')
    .select(reportSelect)
    .eq('owner_id', profile.uid)
    .is('deleted_at', null)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: true })
    .order('created_at', { ascending: false })

  if (reportError) throw reportError

  if (!reports?.length) {
    return []
  }

  const reportIds = reports.map((report) => report.id)

  const { data: photos, error: photoError } = await supabase
    .from('annual_report_photos')
    .select('id,report_id,url,caption,sort_order')
    .in('report_id', reportIds)
    .order('sort_order', { ascending: true })

  if (photoError) throw photoError

  const photosByReport = new Map<
    string,
    SupabaseAnnualReportPhoto[]
  >()

  for (const photo of photos ?? []) {
    const items = photosByReport.get(photo.report_id) ?? []
    items.push(photo)
    photosByReport.set(photo.report_id, items)
  }

  return reports.map((report) => ({
    report,
    photos: photosByReport.get(report.id) ?? [],
  }))
}

export async function createAnnualReport(
  profile: DemoPksProfile,
  input: {
    tahun: number
    periode: string
    bulan: string
    programKerja: string
    hasilPelaksanaan: string
    sasaranTarget: string
    estimasiPencapaian: string
    kendalaPelaksanaan: string
    tindakLanjut: string
    photos: string[]
  },
) {
  const { data: report, error: reportError } = await supabase
    .from('annual_reports')
    .insert({
      owner_id: profile.uid,
      wilayah: profile.wilayah,
      divisi: profile.divisi,
      tahun: input.tahun,
      periode: input.periode,
      bulan: input.bulan,
      program_kerja: input.programKerja,
      hasil_pelaksanaan: input.hasilPelaksanaan,
      sasaran_target: input.sasaranTarget || null,
      estimasi_pencapaian: input.estimasiPencapaian || null,
      kendala_pelaksanaan: input.kendalaPelaksanaan || null,
      tindak_lanjut: input.tindakLanjut || null,
      status: 'published',
    })
    .select(reportSelect)
    .single()

  if (reportError || !report) {
    throw reportError ?? new Error('ANNUAL_REPORT_CREATE_FAILED')
  }

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('annual_report_photos')
      .insert(
        input.photos.map((url, index) => ({
          report_id: report.id,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) {
      await supabase
        .from('annual_reports')
        .delete()
        .eq('id', report.id)
        .eq('owner_id', profile.uid)

      throw photoError
    }
  }

  return report
}

export async function updateAnnualReport(
  profile: DemoPksProfile,
  reportId: string,
  input: {
    tahun: number
    periode: string
    bulan: string
    programKerja: string
    hasilPelaksanaan: string
    sasaranTarget: string
    estimasiPencapaian: string
    kendalaPelaksanaan: string
    tindakLanjut: string
    photos: string[]
  },
) {
  const { data: report, error: reportError } = await supabase
    .from('annual_reports')
    .update({
      tahun: input.tahun,
      periode: input.periode,
      bulan: input.bulan,
      program_kerja: input.programKerja,
      hasil_pelaksanaan: input.hasilPelaksanaan,
      sasaran_target: input.sasaranTarget || null,
      estimasi_pencapaian: input.estimasiPencapaian || null,
      kendala_pelaksanaan: input.kendalaPelaksanaan || null,
      tindak_lanjut: input.tindakLanjut || null,
    })
    .eq('id', reportId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')
    .is('deleted_at', null)
    .select(reportSelect)
    .single()

  if (reportError || !report) {
    throw reportError ?? new Error('ANNUAL_REPORT_UPDATE_FAILED')
  }

  const { error: deletePhotosError } = await supabase
    .from('annual_report_photos')
    .delete()
    .eq('report_id', reportId)

  if (deletePhotosError) throw deletePhotosError

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('annual_report_photos')
      .insert(
        input.photos.map((url, index) => ({
          report_id: reportId,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) throw photoError
  }

  return report
}

export async function deleteAnnualReport(
  profile: DemoPksProfile,
  reportId: string,
) {
  const { error } = await supabase
    .from('annual_reports')
    .delete()
    .eq('id', reportId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')

  if (error) throw error
}
