import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_AUDIT_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_AUDIT_KEY!

export const supabaseAudit = createClient(url, key)
