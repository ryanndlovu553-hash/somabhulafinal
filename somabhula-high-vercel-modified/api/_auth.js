const crypto = require('crypto');

function getAccount(req) {
  const value = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = value.split('.');
  if (!payload || !signature || !process.env.SOMABHULA_AUTH_SECRET) return null;
  const expected = crypto.createHmac('sha256', process.env.SOMABHULA_AUTH_SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const account = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return account.exp > Date.now() && ['clerk', 'student'].includes(account.role) ? account : null;
  } catch { return null; }
}

module.exports = { getAccount };
