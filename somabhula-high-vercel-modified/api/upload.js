const crypto = require('crypto');
const { getAccount } = require('./_auth');
const { uploadMedia } = require('./_supabase');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const account = getAccount(req);
  if (!account) return res.status(401).json({ error: 'Please sign in first.' });
  try {
    const { name, type, data } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!name || !type || !data || !/^(image|video)\//.test(type)) return res.status(400).json({ error: 'Choose a valid image or video file.' });
    const file = Buffer.from(data.split(',').pop(), 'base64');
    if (file.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'Choose a file smaller than 3 MB.' });
    const id = crypto.randomUUID();
    await uploadMedia(id, type, file);
    return res.status(201).json({ id, name, mimeType: type, size: file.length });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Upload could not be completed.' }); }
};
