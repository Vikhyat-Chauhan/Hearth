import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client for client-side use
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Service role client for server-side API routes (bypasses RLS)
export function createSupabaseServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'musician' | 'client'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      musician_profiles: {
        Row: {
          id: string
          user_id: string
          instrument: string
          genres: string[]
          hourly_rate: number | null
          day_rate: number | null
          bio: string | null
          audio_sample_url: string | null
          city: string
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['musician_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['musician_profiles']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          musician_id: string
          event_date: string
          event_type: 'studio' | 'live'
          rate_offer: number
          message: string | null
          status: 'pending' | 'accepted' | 'declined'
          platform_fee: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'platform_fee' | 'created_at' | 'updated_at'>
        Update: Pick<Database['public']['Tables']['bookings']['Row'], 'status'>
      }
    }
  }
}
