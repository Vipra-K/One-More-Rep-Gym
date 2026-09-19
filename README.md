# One More Rep Fitness Studio

React + Vite fitness studio website with a Supabase-backed blog CMS.

## Fixed website images

Permanent landing-page artwork lives in public/resources/. The folder is populated with the current hero, logo, program, recovery, and section images.

## Blog media

Blog images and videos uploaded from the Admin Content Studio are stored in the Supabase Storage bucket blog-media. Blog metadata is stored in blog_posts and article blocks in blog_blocks.

## Routes

- #/ — landing page
- #/blog — public blog
- #/blog/<slug> — individual blog
- #/admin or #/admin/login — admin content studio

The app uses hash routing so GitHub Pages does not require server-side rewrites.

## Admin

Current demo login: admin / admin123. This is a client-side gate, not production authentication. The current Supabase project has demo write policies for the anon role; production should replace these with Supabase Auth and restricted RLS.

## Local development

npm install
npm run dev

Copy .env.example to .env.local if you want to override the Supabase project settings.
