const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
      audience: process.env.FIREBASE_PROJECT_ID,
    },
    (err, decoded) => {
      if (err) {
        console.error("❌ Token verification failed:", err.message || err);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      if (!decoded?.user_id || !decoded?.email) {
        console.error("❌ Token payload invalid:", decoded);
        return res.status(403).json({ error: 'Invalid token payload' });
      }

      req.user = {
        uid: decoded.user_id,
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0] || 'user',
      };

      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Token verified for UID:", req.user.uid);
      }

      next();
    }
  );
};

module.exports = verifyToken;
