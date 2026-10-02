import { supabase } from './supabase'
import { requireSupabaseSession, type DemoPksProfile } from './demoAuth'

export type SupabaseEventItem = {
  id: string
  nama: string
  lokasi: string | null
  tanggal: string
  isi: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  published_at: string | null
  published_by: string | null
  deleted_at: string | null
  owner_id: string
}

export type SupabaseEventPhoto = {
  id: string
  event_id: string
  url: string
  storage_path: string | null
  caption: string | null
  sort_order: number
}

type SupabaseErrorLike = {
  message?: string
  code?: string
  hint?: string | null
}

// postgrest-js returns plain error objects (not Error instances), so convert
// them into an Error whose message carries the Supabase code and hint.
export function toSupabaseError(error: unknown, context: string): Error {
  if (error instanceof Error) return error

  const { message, code, hint } = (error ?? {}) as SupabaseErrorLike
  const parts = [`${context}: ${message || 'kesalahan tidak diketahui'}`]

  if (code) parts.push(`(kode ${code})`)
  if (code === '42501') {
    parts.push('Akun tidak memiliki izin untuk operasi ini.')
  }
  if (hint) parts.push(`Petunjuk: ${hint}`)

  return new Error(parts.join(' '), { cause: error })
}

export async function listMyEvents(profile: DemoPksProfile) {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(
      'id,nama,lokasi,tanggal,isi,status,created_at,updated_at,published_at,published_by,deleted_at,owner_id',
    )
    .eq('owner_id', profile.uid)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (eventsError) throw toSupabaseError(eventsError, 'Event Jemaat gagal dimuat')

  if (!events?.length) {
    return []
  }

  const eventIds = events.map((event) => event.id)

  const { data: photos, error: photosError } = await supabase
    .from('event_photos')
    .select(
      'id,event_id,url,storage_path,caption,sort_order',
    )
    .in('event_id', eventIds)
    .order('sort_order', { ascending: true })

  if (photosError) throw toSupabaseError(photosError, 'Foto Event Jemaat gagal dimuat')

  const photosByEvent = new Map<string, SupabaseEventPhoto[]>()

  for (const photo of photos ?? []) {
    const items = photosByEvent.get(photo.event_id) ?? []
    items.push(photo)
    photosByEvent.set(photo.event_id, items)
  }

  return events.map((event) => ({
    event,
    photos: photosByEvent.get(event.id) ?? [],
  }))
}

export async function createEvent(
  profile: DemoPksProfile,
  input: {
    nama: string
    lokasi: string
    tgl: string
    isi: string
    fotos: string[]
  },
) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      owner_id: profile.uid,
      nama: input.nama,
      lokasi: input.lokasi,
      tanggal: input.tgl,
      isi: input.isi || null,
      // The owner ID comes from the verified Supabase Auth session.
      status: 'draft',
    })
    .select(
      'id,nama,lokasi,tanggal,isi,status,created_at,updated_at,published_at,published_by,deleted_at,owner_id',
    )
    .single()

  if (eventError || !event) {
    throw toSupabaseError(
      eventError ?? new Error('EVENT_CREATE_FAILED'),
      'Event Jemaat gagal disimpan',
    )
  }

  if (input.fotos.length) {
    const { error: photoError } = await supabase
      .from('event_photos')
      .insert(
        input.fotos.map((url, index) => ({
          event_id: event.id,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) {
      await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      throw toSupabaseError(photoError, 'Foto Event Jemaat gagal disimpan')
    }
  }

  return event
}

export async function updateEvent(
  profile: DemoPksProfile,
  eventId: string,
  input: {
    nama: string
    lokasi: string
    tgl: string
    isi: string
    fotos: string[]
  },
) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .update({
      nama: input.nama,
      lokasi: input.lokasi,
      tanggal: input.tgl,
      isi: input.isi || null,
    })
    .eq('id', eventId)
    .eq('owner_id', profile.uid)
    .eq('status', 'draft')
    .select(
      'id,nama,lokasi,tanggal,isi,status,created_at,updated_at,published_at,published_by,deleted_at,owner_id',
    )
    .single()

  if (eventError || !event) {
    throw toSupabaseError(
      eventError ?? new Error('EVENT_UPDATE_FAILED'),
      'Event Jemaat gagal diperbarui',
    )
  }

  const { error: deletePhotosError } = await supabase
    .from('event_photos')
    .delete()
    .eq('event_id', eventId)

  if (deletePhotosError) {
    throw toSupabaseError(deletePhotosError, 'Foto lama Event Jemaat gagal dihapus')
  }

  if (input.fotos.length) {
    const { error: photoError } = await supabase
      .from('event_photos')
      .insert(
        input.fotos.map((url, index) => ({
          event_id: eventId,
          url,
          sort_order: index + 1,
        })),
      )

    if (photoError) {
      throw toSupabaseError(photoError, 'Foto Event Jemaat gagal disimpan')
    }
  }

  return event
}

const EVENT_COLUMNS =
  'id,nama,lokasi,tanggal,isi,status,created_at,updated_at,published_at,published_by,deleted_at,owner_id'

// Publishes a draft owned by the currently authenticated PKS user.
export async function publishEvent(eventId: string) {
  const owner = await requireSupabaseSession()

  const { data: event, error } = await supabase
    .from('events')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: owner.uid,
    })
    .eq('id', eventId)
    .eq('owner_id', owner.uid)
    .eq('status', 'draft')
    .select(EVENT_COLUMNS)
    .maybeSingle()

  if (error) throw toSupabaseError(error, 'Event Jemaat gagal dipublikasikan')

  if (!event) {
    throw new Error(
      'Event tidak dapat dipublikasikan: event tidak ditemukan, bukan milik akun Anda, atau statusnya bukan Draft.',
    )
  }

  return event
}

export async function deleteEvent(
  profile: DemoPksProfile,
  eventId: string,
) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('owner_id', profile.uid)
    .eq('status', 'draft')

  if (error) throw toSupabaseError(error, 'Event Jemaat gagal dihapus')
}
