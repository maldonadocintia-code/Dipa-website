import site from '../data/site.json';

export { site };

export const MSG_GENERAL = 'Hola DIPA! Quiero hacer una consulta';

/** WhatsApp link. With no message, opens the chat without pre-written text. */
export function wa(message?: string): string {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Pre-written message for a product: "Hola DIPA! Quiero consultar por <name>". */
export function productMessage(p: { title: string; whatsappName?: string }): string {
  return `Hola DIPA! Quiero consultar por ${p.whatsappName || p.title.toLowerCase()}`;
}

export const instagramUrl = `https://instagram.com/${site.instagramUser}`;
