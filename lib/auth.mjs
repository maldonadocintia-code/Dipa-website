/**
 * Verifies a Google Sign-In ID token and checks it against the admin allowlist.
 * (Same approach as the SunMoonRisingYoga portal.)
 *
 * Google's tokeninfo endpoint validates the signature and expiry, so there is
 * no JWT library to keep updated. We then check:
 *   1. the token was issued for this site's Google client (aud),
 *   2. Google has verified the email address,
 *   3. the email is in ADMIN_EMAILS.
 *
 * Env: GOOGLE_CLIENT_ID, ADMIN_EMAILS (comma-separated)
 */

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

function allowlist() {
  return (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin(headers = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const allowed = allowlist();
  if (!clientId || !allowed.length) throw new AuthError('El panel todavía no está configurado (GOOGLE_CLIENT_ID / ADMIN_EMAILS).', 500);

  const raw = headers.authorization || headers.Authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) throw new AuthError('Iniciá sesión para continuar.');

  let claims;
  try {
    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
    if (!res.ok) throw new Error('rejected');
    claims = await res.json();
  } catch {
    throw new AuthError('Tu sesión venció. Volvé a iniciar sesión.');
  }

  if (claims.aud !== clientId) throw new AuthError('Ese inicio de sesión no es para este sitio.');
  if (String(claims.email_verified) !== 'true') throw new AuthError('El email de tu cuenta de Google no está verificado.');

  const email = String(claims.email || '').toLowerCase();
  if (!allowed.includes(email)) throw new AuthError(`${email} no tiene permiso para editar este sitio.`, 403);
  return { email };
}
