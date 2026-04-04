// ════════════════════════════════════
//   nauc.me — supabase.js
//   ⚠️  Sem doplň své vlastní klíče!
// ════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://TVUJ-PROJEKT.supabase.co'   // ← sem doplň
const SUPABASE_KEY = 'TVUJ-ANON-KEY'                       // ← sem doplň

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
