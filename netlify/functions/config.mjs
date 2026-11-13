/**
 * GET /.netlify/functions/config  ->  { clientId }
 * The Google client ID is public by design (the browser needs it to start
 * Google Sign-In); it authorises nothing on its own.
 */
import { json } from '../../lib/http.mjs';
import { googleClientId } from '../../lib/google-client-id.mjs';

export const handler = async () => {
  const clientId = googleClientId();
  return json(clientId ? 200 : 500, clientId ? { clientId } : { error: 'Falta configurar GOOGLE_CLIENT_ID en Netlify.' });
};
