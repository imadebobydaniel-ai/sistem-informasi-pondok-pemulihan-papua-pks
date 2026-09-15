import { supabase } from './supabase'
import type { DemoPksProfile } from './demoAuth'

export type SupabaseAnnualActivity = {
  id: string
  owner_id: string
  wilayah: string
  divisi: string
  nama_kegiatan: string
  tanggal_kegiatan: string
  tahun_kegiatan: number
  lokasi_kegiatan: string
  agenda_kegiatan: string
  keterangan: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SupabaseAnnualActivityPhoto = {
  id: string
  activity_id: string
  url: string
  caption: string | null
  sort_order: number
}

const activitySelect =
  'id,owner_id,wilayah,divisi,nama_kegiatan,tanggal_kegiatan,tahun_kegiatan,lokasi_kegiatan,agenda_kegiatan,keterangan,status,created_at,updated_at,deleted_at'

export async function listMyAnnualActivities(profile: DemoPksProfile) {
  const { data: activities, error: activityError } = await supabase
    .from('annual_activities')
    .select(activitySelect)
    .eq('owner_id', profile.uid)
    .is('deleted_at', null)
    .order('tanggal_kegiatan', { ascending: false })
    .order('created_at', { ascending: false })

  if (activityError) throw activityError

  if (!activities?.length) {
    return []
  }

  const activityIds = activities.map((activity) => activity.id)

  const { data: photos, error: photoError } = await supabase
    .from('annual_activity_photos')
    .select('id,activity_id,url,caption,sort_order')
    .in('activity_id', activityIds)
    .order('sort_order', { ascending: true })

  if (photoError) throw photoError

  const photosByActivity = new Map<
    string,
    SupabaseAnnualActivityPhoto[]
  >()

  for (const photo of photos ?? []) {
    const items = photosByActivity.get(photo.activity_id) ?? []
    items.push(photo)
    photosByActivity.set(photo.activity_id, items)
  }

  return activities.map((activity) => ({
    activity,
    photos: photosByActivity.get(activity.id) ?? [],
  }))
}

export async function createAnnualActivity(
  profile: DemoPksProfile,
  input: {
    namaKegiatan: string
    tanggalKegiatan: string
    tahunKegiatan: number
    lokasiKegiatan: string
    agendaKegiatan: string
    keterangan: string
    photos: string[]
  },
) {
  const { data: activity, error: activityError } = await supabase
    .from('annual_activities')
    .insert({
      owner_id: profile.uid,
      wilayah: profile.wilayah,
      divisi: profile.divisi,
      nama_kegiatan: input.namaKegiatan.trim(),
      tanggal_kegiatan: input.tanggalKegiatan,
      tahun_kegiatan: input.tahunKegiatan,
      lokasi_kegiatan: input.lokasiKegiatan.trim(),
      agenda_kegiatan: input.agendaKegiatan.trim(),
      keterangan: input.keterangan.trim() || null,
      status: 'published',
    })
    .select(activitySelect)
    .single()

  if (activityError || !activity) {
    throw activityError ?? new Error('ANNUAL_ACTIVITY_CREATE_FAILED')
  }

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('annual_activity_photos')
      .insert(
        input.photos.slice(0, 5).map((url, index) => ({
          activity_id: activity.id,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) {
      await supabase
        .from('annual_activities')
        .delete()
        .eq('id', activity.id)
        .eq('owner_id', profile.uid)

      throw photoError
    }
  }

  return activity
}

export async function updateAnnualActivity(
  profile: DemoPksProfile,
  activityId: string,
  input: {
    namaKegiatan: string
    tanggalKegiatan: string
    tahunKegiatan: number
    lokasiKegiatan: string
    agendaKegiatan: string
    keterangan: string
    photos: string[]
  },
) {
  const { data: activity, error: activityError } = await supabase
    .from('annual_activities')
    .update({
      nama_kegiatan: input.namaKegiatan.trim(),
      tanggal_kegiatan: input.tanggalKegiatan,
      tahun_kegiatan: input.tahunKegiatan,
      lokasi_kegiatan: input.lokasiKegiatan.trim(),
      agenda_kegiatan: input.agendaKegiatan.trim(),
      keterangan: input.keterangan.trim() || null,
    })
    .eq('id', activityId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')
    .is('deleted_at', null)
    .select(activitySelect)
    .single()

  if (activityError || !activity) {
    throw activityError ?? new Error('ANNUAL_ACTIVITY_UPDATE_FAILED')
  }

  const { error: deletePhotosError } = await supabase
    .from('annual_activity_photos')
    .delete()
    .eq('activity_id', activityId)

  if (deletePhotosError) throw deletePhotosError

  if (input.photos.length) {
    const { error: photoError } = await supabase
      .from('annual_activity_photos')
      .insert(
        input.photos.slice(0, 5).map((url, index) => ({
          activity_id: activityId,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) throw photoError
  }

  return activity
}

export async function deleteAnnualActivity(
  profile: DemoPksProfile,
  activityId: string,
) {
  const { error } = await supabase
    .from('annual_activities')
    .delete()
    .eq('id', activityId)
    .eq('owner_id', profile.uid)
    .eq('status', 'published')

  if (error) throw error
}
