import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vvxsiulnbdallsnjogeb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cVVzId3P8oEgY0tCvLeaMA_QE7UtFp5';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\\/+/, '')}`;
}

export const BLOG_BUCKET = 'blog-media';

export function publicMediaUrl(path: string | null | undefined) {
  if (!path) return '';
  return supabase.storage.from(BLOG_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
