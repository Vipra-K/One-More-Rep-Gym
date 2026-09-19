import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://vvxsiulnbdallsnjogeb.supabase.co',
  'sb_publishable_cVVzId3P8oEgY0tCvLeaMA_QE7UtFp5',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export const BLOG_BUCKET = 'blog-media';

export function publicMediaUrl(path: string | null | undefined) {
  if (!path) return '';
  return supabase.storage.from(BLOG_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
