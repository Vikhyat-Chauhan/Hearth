import { type NextRequest } from 'next/server'
import { createSupabaseServiceClient } from '../../../lib/supabase'

// PATCH /api/bookings/[id] — musician accepts or declines
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServiceClient()
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status } = body as { status: string }

  if (!['accepted', 'declined'].includes(status)) {
    return Response.json({ error: 'status must be accepted or declined' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const statusCode = error.code === 'PGRST116' ? 404 : 500
    return Response.json({ error: error.message }, { status: statusCode })
  }

  return Response.json({ booking: data })
}

// GET /api/bookings/[id] — fetch single booking
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServiceClient()
  const { id } = await params

  const { data, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return Response.json({ error: error.message }, { status })
  }

  return Response.json({ booking: data })
}
