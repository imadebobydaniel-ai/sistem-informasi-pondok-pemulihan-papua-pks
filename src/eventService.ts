import { supabase } from './supabase'
import { requirePksAdmin, type DemoPksProfile } from './demoAuth'

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
      // RLS only lets PKS create their own drafts; an admin publishes later.
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

export type ReviewEventItem = {
  event: SupabaseEventItem
  owner: { nama: string; wilayah: string; divisi: string } | null
}

// Admin review list: drafts from every PKS plus published events. RLS
// ("Admin can view all events" / is_pks_admin()) decides what is returned.
export async function listEventsForReview(): Promise<ReviewEventItem[]> {
  const { data: events, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .in('status', ['draft', 'published'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw toSupabaseError(error, 'Daftar review Event Jemaat gagal dimuat')

  if (!events?.length) {
    return []
  }

  const ownerIds = [...new Set(events.map((event) => event.owner_id))]
  const { data: owners, error: ownersError } = await supabase
    .from('pks_profiles')
    .select('id,nama,wilayah,divisi')
    .in('id', ownerIds)

  // Owner details are informational; the review list still works without them.
  if (ownersError) {
    console.warn('Profil pemilik event tidak dapat dimuat:', ownersError)
  }

  const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner]))

  return events.map((event) => ({
    event,
    owner: ownersById.get(event.owner_id) ?? null,
  }))
}

// Publishes a single draft. The admin check and published_by come from the
// verified Supabase session here, never from the caller. Filtering on
// status='draft' means an already published event, or a row RLS hides from
// non-admins, updates nothing.
export async function publishEvent(eventId: string) {
  const admin = await requirePksAdmin()

  const { data: event, error } = await supabase
    .from('events')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: admin.uid,
    })
    .eq('id', eventId)
    .eq('status', 'draft')
    .select(EVENT_COLUMNS)
    .maybeSingle()

  if (error) throw toSupabaseError(error, 'Event Jemaat gagal dipublikasikan')

  if (!event) {
    throw new Error(
      'Event tidak dapat dipublikasikan: event tidak ditemukan, sudah dipublikasikan, atau akun Anda bukan admin.',
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

  if (error) throw toSupabaseError(error, 'Event Jemaat gagal dihapus')
}
