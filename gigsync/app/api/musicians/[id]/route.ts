import { createSupabaseServiceClient } from '../../../lib/supabase'

// GET /api/musicians/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServiceClient()
  const { id } = await params

  const { data, error } = await supabase
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
    .eq('user_id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return Response.json({ error: error.message }, { status })
  }

  return Response.json({ musician: data })
}
