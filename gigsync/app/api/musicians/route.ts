import { type NextRequest } from 'next/server'
import { createSupabaseServiceClient } from '../../lib/supabase'

// GET /api/musicians?instrument=guitar&genre=jazz&city=NYC
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServiceClient()
  const { searchParams } = request.nextUrl

  const instrument = searchParams.get('instrument')
  const genre = searchParams.get('genre')
  const city = searchParams.get('city')

  let query = supabase
    .from('musician_profiles')
    .select(`
      *,
      profiles (
        id,
        full_name,
        avatar_url,
        email
      )
    `)
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (instrument) {
    query = query.ilike('instrument', `%${instrument}%`)
  }
  if (genre) {
    query = query.contains('genres', [genre])
  }
  if (city) {
    query = query.ilike('city', `%${city}%`)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ musicians: data })
}

// POST /api/musicians — create or update musician profile (upsert)
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, instrument, genres, hourly_rate, day_rate, bio, audio_sample_url, city } = body as {
    user_id: string
    instrument: string
    genres: string[]
    hourly_rate?: number
    day_rate?: number
    bio?: string
    audio_sample_url?: string
    city: string
  }

  if (!user_id || !instrument || !city) {
    return Response.json({ error: 'user_id, instrument, and city are required' }, { status: 400 })
  }

  // Ensure user has musician role
  await supabase
    .from('profiles')
    .update({ role: 'musician' })
    .eq('id', user_id)

  const { data, error } = await supabase
    .from('musician_profiles')
    .upsert(
      { user_id, instrument, genres: genres ?? [], hourly_rate, day_rate, bio, audio_sample_url, city },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ musician: data }, { status: 201 })
}
