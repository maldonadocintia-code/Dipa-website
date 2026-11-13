/**
 * GOOGLE_CLIENT_ID as pasted into Netlify, tidied: a client ID is just
 * "<number>-<letters>.apps.googleusercontent.com", but it's easy to paste it
 * with "https://", a trailing slash or spaces.
 */
export function googleClientId() {
  return (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
