# Somabhula High School — Vercel website

Deploy this folder as a Vercel project. Its entry point is `index.html`, supplied site images are in `images/`, and the `api/` folder contains the serverless login, content, upload, and media functions. School records are stored in Supabase Postgres. Uploaded images and videos remain in a private Supabase Storage bucket. Leadership photos, news images, and photos added to the public gallery are served to website visitors without requiring an account; videos and school management features still require a school login. Only upload images that the school has approved for public viewing, including any necessary consent for student photos.

## Administrator access

Before deploying, create a Supabase project owned by Somabhula High School. In the Supabase SQL Editor, run `supabase/setup.sql`. This creates the single-row content table and a private `school-media` bucket. In the Supabase project dashboard, copy the Project URL and create or copy a server-only Secret API key. Add them and the school login values to the Vercel project's Environment Variables. Never put the Supabase secret key or school credentials in this repository or in browser code.

- `SUPABASE_URL` (the Project URL)
- `SUPABASE_SECRET_KEY` (the server-side secret API key; keep it private)
- `SOMABHULA_AUTH_SECRET` (a long random secret)
- `SOMABHULA_CLERK_USERNAME` and `SOMABHULA_CLERK_PASSWORD`
- `SOMABHULA_STUDENT_USERNAME` and `SOMABHULA_STUDENT_PASSWORD`

After running the SQL and adding the variables, deploy the project from its root folder. In Vercel, choose the project's root directory if prompted, leave the build command empty, and use `./` as the output directory. Set the login credentials before sharing the site.

The API checks that an image is part of published public content before serving it to visitors. Videos and unpublished media require a school login. Individual files are limited to 3 MB to stay within Vercel's function request limit.

The Supabase free plan has storage and database quotas. Check the current Supabase dashboard for usage. Existing records in another database and existing Google Drive uploads are not migrated automatically.
