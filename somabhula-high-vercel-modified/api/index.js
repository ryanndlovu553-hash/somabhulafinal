const crypto = require('crypto');
const { getAccount } = require('./_auth');
const { getContent, saveContent, deleteMediaFile } = require('./_supabase');
const empty = () => ({ news: [], events: [], leaders: [], photos: [], videos: [] });
const map = { news: 'news', event: 'events', leader: 'leaders', photo: 'photos', video: 'videos' };

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function sign(value) { return crypto.createHmac('sha256', process.env.SOMABHULA_AUTH_SECRET || '').update(value).digest('base64url'); }
function token(role) { const value = encode({ role, exp: Date.now() + 8 * 60 * 60 * 1000 }); return `${value}.${sign(value)}`; }
function user(req) {
  const value = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !process.env.SOMABHULA_AUTH_SECRET) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString()); return data.exp > Date.now() ? data : null; } catch { return null; }
}
function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
async function content() { return { ...empty(), ...(await getContent()) }; }
function send(res, code, data) { return res.status(code).json(data); }
function publicContent(data) {
  return {
    ...data,
    news: data.news.map((item) => ({ ...item, image: '' })),
    leaders: data.leaders.map((item) => ({ ...item, image: '' })),
    photos: data.photos.map((item) => ({
      id: item.id,
      title: item.title,
      imageId: item.imageId,
      created: item.created
    })),
    videos: []
  };
}

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    if (req.method === 'GET' && action === 'public') {
      const data = await content();
      return send(res, 200, getAccount(req) ? data : publicContent(data));
    }
    if (req.method === 'POST' && action === 'login') {
      const input = body(req); const role = input.role;
      if (!['clerk', 'student'].includes(role)) return send(res, 400, { error: 'Invalid account type.' });
      const username = process.env[`SOMABHULA_${role?.toUpperCase()}_USERNAME`];
      const password = process.env[`SOMABHULA_${role?.toUpperCase()}_PASSWORD`];
      if (!process.env.SOMABHULA_AUTH_SECRET || !username || !password) return send(res, 500, { error: 'School login has not been configured on Vercel.' });
      if (input.username !== username || input.password !== password) return send(res, 401, { error: 'Incorrect username, password, or account type.' });
      return send(res, 200, { token: token(role), role });
    }
    const account = user(req);
    if (!account) return send(res, 401, { error: 'Please sign in first.' });
    if (req.method === 'GET' && action === 'admin') return send(res, 200, await content());
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
    const input = body(req); const collection = map[input.type];
    if (!collection) return send(res, 400, { error: 'Invalid content type.' });
    const db = await content();
    if (action === 'create') {
      if (account.role === 'student' && !['photo', 'video'].includes(input.type)) return send(res, 403, { error: 'This account cannot manage that section.' });
      const item = { ...input, id: crypto.randomUUID(), created: Date.now(), uploadedBy: account.role };
      db[collection].push(item); await saveContent(db); return send(res, 201, { ok: true, item });
    }
    if (action === 'delete') {
      const item = db[collection].find((entry) => entry.id === input.id);
      if (!item) return send(res, 404, { error: 'Item not found.' });
      if (account.role === 'student' && item.uploadedBy !== 'student') return send(res, 403, { error: 'This account can only delete its own uploads.' });
      await Promise.allSettled([item.imageId, item.fileId].filter(Boolean).map(deleteMediaFile));
      db[collection] = db[collection].filter((entry) => entry.id !== input.id); await saveContent(db); return send(res, 200, { ok: true });
    }
    return send(res, 400, { error: 'Unsupported request.' });
  } catch (error) { console.error(error); return send(res, 500, { error: 'The server could not complete that request.' }); }
};
