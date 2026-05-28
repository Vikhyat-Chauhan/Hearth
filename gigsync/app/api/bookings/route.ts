import { type NextRequest } from 'next/server'
import { createSupabaseServiceClient } from '../../lib/supabase'

// GET /api/bookings?user_id=xxx&role=client|musician
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServiceClient()
  const { searchParams } = request.nextUrl

  const userId = searchParams.get('user_id')
  const role = searchParams.get('role') // 'client' or 'musician'
  const status = searchParams.get('status') // optional filter: pending|accepted|declined

  if (!userId || !role) {
    return Response.json({ error: 'user_id and role are required' }, { status: 400 })
  }

  const column = role === 'musician' ? 'musician_id' : 'client_id'

  let query = supabase
    .from('bookings')
    .select(`
      *,
      client:profiles!bookings_client_id_fkey (
        id,
        full_name,
        email
      ),
      musician:profiles!bookings_musician_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq(column, userId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ bookings: data })
}

// POST /api/bookings — client creates a booking request
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { client_id, musician_id, event_date, event_type, rate_offer, message } = body as {
    client_id: string
    musician_id: string
    event_date: string
    event_type: 'studio' | 'live'
    rate_offer: number
    message?: string
  }

  if (!client_id || !musician_id || !event_date || !event_type || rate_offer == null) {
    return Response.json(
      { error: 'client_id, musician_id, event_date, event_type, and rate_offer are required' },
      { status: 400 }
    )
  }

  if (!['studio', 'live'].includes(event_type)) {
    return Response.json({ error: 'event_type must be studio or live' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({ client_id, musician_id, event_date, event_type, rate_offer, message })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ booking: data }, { status: 201 })
}
