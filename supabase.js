import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://dxibiwizupnnmsdqovee.supabase.co'   // ← sem doplň
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aWJpd2l6dXBubm1zZHFvdmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDI5NDMsImV4cCI6MjA5MDgxODk0M30.KEdRUbKDqfwWooeCeuHNDScBQWGp7c7R9VGv8lWHsaY'                       // ← sem doplň

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
