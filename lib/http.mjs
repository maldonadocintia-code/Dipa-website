import { AuthError } from './auth.mjs';

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export function handleError(err, fallbackStatus = 400) {
  if (err instanceof AuthError) return json(err.statusCode, { error: err.message });
  console.error(err);
  return json(fallbackStatus, { error: err.message || 'Algo salió mal.' });
}
