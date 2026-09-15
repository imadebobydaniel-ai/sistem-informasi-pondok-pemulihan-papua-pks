import { supabase } from './supabase'
import type { DemoPksProfile } from './demoAuth'

export type SupabaseAgendaItem = {
  id: string
  owner_id: string
  wilayah: string
  divisi: string
  tahun: number
  periode: string
  bulan: string
  program_kerja: string
  tujuan_pelaksanaan: string
  sasaran_target: string
  estimasi_pencapaian: string | null
  minggu_i: string | null
  minggu_ii: string | null
  minggu_iii: string | null
  minggu_iv: string | null
  keterangan: string | null
  kendala_pelaksanaan: string | null
  tindak_lanjut: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SupabaseAgendaPhoto = {
  id: string
  agenda_id: string
  url: string
  caption: string | null
  sort_order: number
}

export async function listMyAgendas(profile: DemoPksProfile) {
  const { data: agendas, error: agendaError } = await supabase
    .from('agenda_programs')
    .select(
      'id,owner_id,wilayah,divisi,tahun,periode,bulan,program_kerja,tujuan_pelaksanaan,sasaran_target,estimasi_pencapaian,minggu_i,minggu_ii,minggu_iii,minggu_iv,keterangan,kendala_pelaksanaan,tindak_lanjut,status,created_at,updated_at,deleted_at',
    )
    .eq('owner_id', profile.uid)
    .is('deleted_at', null)
    .order('tahun', { ascending: false })
    .order('bulan', { ascending: true })
    .order('created_at', { ascending: false })

  if (agendaError) throw agendaError

  if (!agendas?.length) {
    return []
  }

  const agendaIds = agendas.map((agenda) => agenda.id)

  const { data: photos, error: photoError } = await supabase
    .from('agenda_program_photos')
    .select('id,agenda_id,url,caption,sort_order')
    .in('agenda_id', agendaIds)
    .order('sort_order', { ascending: true })

  if (photoError) throw photoError

  const photosByAgenda = new Map<string, SupabaseAgendaPhoto[]>()

  for (const photo of photos ?? []) {
    const items = photosByAgenda.get(photo.agenda_id) ?? []
    items.push(photo)
    photosByAgenda.set(photo.agenda_id, items)
  }

  return agendas.map((agenda) => ({
    agenda,
    photos: photosByAgenda.get(agenda.id) ?? [],
  }))
}

export async function createAgenda(
  profile: DemoPksProfile,
  input: {
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
    photos: string[]
  },
) {
  const { data: agenda, error: agendaError } = await supabase
    .from('agenda_programs')
    .insert({
      owner_id: profile.uid,
      wilayah: profile.wilayah,
      divisi: profile.divisi,
      tahun: input.tahun,
      periode: input.periode,
      bulan: input.bulan,
      program_kerja: input.programKerja,
      tujuan_pelaksanaan: input.tujuanPelaksanaan,
      sasaran_target: input.sasaranTarget,
      estimasi_pencapaian: input.estimasiPencapaian || null,
      minggu_i: input.mingguI || null,
      minggu_ii: input.mingguII || null,
      minggu_iii: input.mingguIII || null,
      minggu_iv: input.mingguIV || null,
      keterangan: input.keterangan || null,
      kendala_pelaksanaan: input.kendalaPelaksanaan || null,
      tindak_lanjut: input.tindakLanjut || null,
      status: 'published',
    })
    .select(
      'id,owner_id,wilayah,divisi,tahun,periode,bulan,program_kerja,tujuan_pelaksanaan,sasaran_target,estimasi_pencapaian,minggu_i,minggu_ii,minggu_iii,minggu_iv,keterangan,kendala_pelaksanaan,tindak_lanjut,status,created_at,updated_at,deleted_at',
    )
    .single()

  if (agendaError || !agenda) {
    throw agendaError ?? new Error('AGENDA_CREATE_FAILED')
  }

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('agenda_program_photos')
      .insert(
        input.photos.map((url, index) => ({
          agenda_id: agenda.id,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) {
      await supabase
        .from('agenda_programs')
        .delete()
        .eq('id', agenda.id)

      throw photoError
    }
  }

  return agenda
}

export async function updateAgenda(
  profile: DemoPksProfile,
  agendaId: string,
  input: {
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
    photos: string[]
  },
) {
  const { data: agenda, error: agendaError } = await supabase
    .from('agenda_programs')
    .update({
      tahun: input.tahun,
      periode: input.periode,
      bulan: input.bulan,
      program_kerja: input.programKerja,
      tujuan_pelaksanaan: input.tujuanPelaksanaan,
      sasaran_target: input.sasaranTarget,
      estimasi_pencapaian: input.estimasiPencapaian || null,
      minggu_i: input.mingguI || null,
      minggu_ii: input.mingguII || null,
      minggu_iii: input.mingguIII || null,
      minggu_iv: input.mingguIV || null,
      keterangan: input.keterangan || null,
      kendala_pelaksanaan: input.kendalaPelaksanaan || null,
      tindak_lanjut: input.tindakLanjut || null,
    })
    .eq('id', agendaId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')
    .is('deleted_at', null)
    .select(
      'id,owner_id,wilayah,divisi,tahun,periode,bulan,program_kerja,tujuan_pelaksanaan,sasaran_target,estimasi_pencapaian,minggu_i,minggu_ii,minggu_iii,minggu_iv,keterangan,kendala_pelaksanaan,tindak_lanjut,status,created_at,updated_at,deleted_at',
    )
    .single()

  if (agendaError || !agenda) {
    throw agendaError ?? new Error('AGENDA_UPDATE_FAILED')
  }

  const { error: deletePhotosError } = await supabase
    .from('agenda_program_photos')
    .delete()
    .eq('agenda_id', agendaId)

  if (deletePhotosError) throw deletePhotosError

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('agenda_program_photos')
      .insert(
        input.photos.map((url, index) => ({
          agenda_id: agendaId,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) throw photoError
  }

  return agenda
}

export async function deleteAgenda(
  profile: DemoPksProfile,
  agendaId: string,
) {
  const { error } = await supabase
    .from('agenda_programs')
    .delete()
    .eq('id', agendaId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')

  if (error) throw error
}
