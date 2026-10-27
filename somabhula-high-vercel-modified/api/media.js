const { getAccount } = require('./_auth');
const { getContent, getMedia } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const fileId = req.query.id;
  if (!fileId || !/^[a-f0-9-]{36}$/i.test(fileId)) return res.status(400).json({ error: 'Invalid media identifier.' });
  try {
    const account = getAccount(req);
    if (!account) {
      const content = await getContent();
      const publicImageIds = new Set([
        ...content.news.map((item) => item.imageId),
        ...content.leaders.map((item) => item.imageId),
        ...content.photos.map((item) => item.imageId)
      ].filter((id) => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)));
      if (!publicImageIds.has(fileId)) return res.status(401).json({ error: 'This media is available only to signed-in school accounts.' });
    }
    const response = await getMedia(fileId);
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error: 'Supabase Storage could not load this media.' });
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'This media exceeds the current serving limit.' });
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', account ? 'private, no-store' : 'public, max-age=60, s-maxage=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Media could not be loaded from Supabase Storage.' });
  }
};
