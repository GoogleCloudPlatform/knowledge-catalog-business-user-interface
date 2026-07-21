// middleware/googleAuth.js
//
// Express middleware that verifies the Google OAuth access token on every
// incoming backend API request.
//
// Each route in this app forwards the caller's Bearer token to Google Cloud
// APIs (Dataplex, BigQuery, Resource Manager, ...) as an OAuth *access token*.
// This middleware verifies that token up-front against Google's tokeninfo
// endpoint so that unauthenticated / expired / forged tokens are rejected with
// a 401 before any handler runs, instead of failing deep inside a GCP call.
//
// Verified identity is attached to the request as:
//   req.accessToken  -> the raw Bearer token
//   req.auth         -> the full TokenInfo returned by Google
//   req.user         -> { email, sub, emailVerified, scopes, expiryDate }
//
// Configuration (all optional, via environment variables):
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_AUDIENCE
//       When set, the token's `aud`/`azp` must match it (ensures the token was
//       minted for THIS application and not some other Google OAuth client).
//   ALLOWED_EMAIL_DOMAINS
//       Comma-separated list (e.g. "cloudsufi.com,example.com"). When set, only
//       users whose verified email is in one of these domains are allowed.
//   DISABLE_AUTH=true
//       Escape hatch to bypass verification (intended for local dev / tests).

const { OAuth2Client } = require('google-auth-library');

const oAuth2Client = new OAuth2Client();

// In-memory TTL cache so we don't call Google's tokeninfo endpoint on every
// single request. Access tokens are short-lived & opaque, so caching the
// verification result for a short window is safe and avoids extra latency and
// tokeninfo rate-limit pressure under load.
const tokenCache = new Map(); // token -> { info, expiresAt }
const MAX_CACHE_ENTRIES = 5000;
const MAX_CACHE_TTL_MS = 5 * 60 * 1000; // never trust a cached result > 5 min

function getCached(token) {
  const entry = tokenCache.get(token);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    tokenCache.delete(token);
    return null;
  }
  return entry.info;
}

function setCached(token, info) {
  // Bound the cache size: evict the oldest entry when full (Map preserves
  // insertion order, so the first key is the oldest).
  if (tokenCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey !== undefined) tokenCache.delete(oldestKey);
  }
  const tokenExpMs = typeof info.expiry_date === 'number' ? info.expiry_date : 0;
  const ttl = tokenExpMs
    ? Math.min(tokenExpMs - Date.now(), MAX_CACHE_TTL_MS)
    : MAX_CACHE_TTL_MS;
  if (ttl <= 0) return; // token already expired — don't cache
  tokenCache.set(token, { info, expiresAt: Date.now() + ttl });
}

function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  if (!/^Bearer$/i.test(scheme) || !value) return null;
  return value.trim();
}

function matchesPublicPath(reqPath, publicPaths) {
  return publicPaths.some((p) =>
    p instanceof RegExp ? p.test(reqPath) : reqPath === p || reqPath === `${p}/`
  );
}

/**
 * Build the Google authentication middleware.
 * @param {object} [options]
 * @param {(string|RegExp)[]} [options.publicPaths] Paths (matched against
 *   req.originalUrl, query stripped) that bypass auth, e.g. health checks.
 * @param {string|null} [options.audience] Required token aud/azp, if any.
 * @param {string[]} [options.allowedDomains] Allowed email domains, if any.
 * @param {boolean} [options.disabled] Bypass verification entirely.
 */
function createGoogleAuthMiddleware(options = {}) {
  const {
    publicPaths = ['/api/health', '/api/access-request/health'],
    audience =
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_AUDIENCE ||
      null,
    allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    disabled = process.env.DISABLE_AUTH === 'true',
  } = options;

  return async function googleAuthMiddleware(req, res, next) {
    // Let CORS preflight requests through (they carry no Authorization header).
    if (req.method === 'OPTIONS') return next();

    // Allow explicitly-public endpoints (e.g. health checks) through.
    const reqPath = (req.originalUrl || req.url || '').split('?')[0];
    if (matchesPublicPath(reqPath, publicPaths)) return next();

    // Escape hatch for local development / automated tests.
    if (disabled) return next();

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Bearer access token in the Authorization header.',
      });
    }

    try {
      let info = getCached(token);
      if (!info) {
        // Validates the access token with Google and checks its expiry.
        // Throws if the token is invalid, revoked, or expired.
        info = await oAuth2Client.getTokenInfo(token);
        setCached(token, info);
      }

      // Optional: ensure the token was minted for our OAuth client.
      if (audience && info.aud !== audience && info.azp !== audience) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Access token was not issued for this application.',
        });
      }

      // Optional: restrict access to specific (verified) email domains.
      if (allowedDomains.length > 0) {
        const email = (info.email || '').toLowerCase();
        const domain = email.split('@')[1] || '';
        if (!email || info.email_verified === false || !allowedDomains.includes(domain)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Your account is not permitted to access this resource.',
          });
        }
      }

      // Expose the verified identity + token to downstream handlers.
      req.accessToken = token;
      req.auth = info;
      req.user = {
        email: info.email || null,
        sub: info.sub || null,
        emailVerified: info.email_verified ?? null,
        scopes: info.scopes || [],
        expiryDate: info.expiry_date || null,
      };

      return next();
    } catch (err) {
      console.warn('Google token verification failed:', err?.message || err);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired Google access token.',
      });
    }
  };
}

// Default, env-configured middleware instance for convenient mounting.
const googleAuthMiddleware = createGoogleAuthMiddleware();

module.exports = { googleAuthMiddleware, createGoogleAuthMiddleware };
