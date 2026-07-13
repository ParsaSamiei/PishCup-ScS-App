const crypto = require('crypto');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getAuthConfig() {
  return {
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD,
    secret: process.env.AUTH_SECRET || process.env.AUTH_PASSWORD,
  };
}

function createToken(username) {
  const { secret } = getAuthConfig();
  if (!secret) throw new Error('AUTH_PASSWORD or AUTH_SECRET must be set');

  const payload = { sub: username, exp: Date.now() + TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  const { secret } = getAuthConfig();
  if (!secret || !token) return null;

  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function validateCredentials(username, password) {
  const { username: expectedUser, password: expectedPass } = getAuthConfig();
  if (!expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'ورود لازم است' });
  }
  req.user = payload;
  next();
}

module.exports = { createToken, verifyToken, validateCredentials, authMiddleware, getAuthConfig };
