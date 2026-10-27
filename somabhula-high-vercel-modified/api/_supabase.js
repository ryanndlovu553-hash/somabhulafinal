const crypto = require('crypto');

const BUCKET = 'school-media';

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.');
  return { url, key };
}

function headers(extra = {}) {
  const { key } = config();
  const result = { apikey: key, ...extra };
  // Legacy service_role keys are JWTs and need a bearer header. New sb_secret keys
  // must be sent as apikey only; Supabase rejects them when used as a JWT.
  if (key.startsWith('eyJ')) result.Authorization = `Bearer ${key}`;
  return result;
}

async function supabase(path, options = {}) {
  const { url } = config();
  return fetch(`${url}${path}`, { ...options, headers: headers(options.headers || {}) });
}

const emptyContent = () => ({ news: [], events: [], leaders: [], photos: [], videos: [] });

async function getContent() {
  const response = await supabase('/rest/v1/school_content?select=content&id=eq.1');
  if (!response.ok) throw new Error('Supabase could not load school content. Check the setup SQL and API key.');
  const rows = await response.json();
  return rows[0]?.content && typeof rows[0].content === 'object'
    ? { ...emptyContent(), ...rows[0].content }
    : emptyContent();
}

async function saveContent(content) {
  const response = await supabase('/rest/v1/school_content?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, content, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error('Supabase could not save school content. Check the setup SQL and API key.');
}

function mediaPath(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid media identifier.');
  return `uploads/${id}`;
}

async function uploadMedia(id, mimeType, data) {
  const response = await supabase(`/storage/v1/object/${BUCKET}/${mediaPath(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': mimeType, 'x-upsert': 'false' },
    body: data
  });
  if (!response.ok) throw new Error('Supabase Storage could not save the upload. Check that the private school-media bucket exists.');
}

async function getMedia(id) {
  return supabase(`/storage/v1/object/${BUCKET}/${mediaPath(id)}`);
}

async function deleteMediaFile(id) {
  const response = await supabase(`/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [mediaPath(id)] })
  });
  if (!response.ok && response.status !== 404) throw new Error('Supabase Storage could not delete the media file.');
}

module.exports = { getContent, saveContent, uploadMedia, getMedia, deleteMediaFile };
