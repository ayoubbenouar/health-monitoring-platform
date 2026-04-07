/**
 * Base URL de l'API. En dev: appel direct au gateway (127.0.0.1:8080 pour éviter les soucis localhost sous Windows).
 */
export const API_BASE =
  typeof window !== 'undefined'
    ? (import.meta.env?.DEV ? 'http://127.0.0.1:8080' : '')
    : '';

export function getToken() {
  return localStorage.getItem('token');
}

export async function parseResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return { error: text || res.statusText };
  }
}

export function getErrorMessage(data, fallback = 'Erreur') {
  const d = data?.detail;
  if (Array.isArray(d)) return d.map((m) => (m && m.msg) || m).join(', ');
  if (typeof d === 'string') return d;
  const msg = data?.error || data?.message || fallback;
  if (typeof msg === 'string' && (msg.includes('proxy') || msg.includes('ECONNREFUSED') || msg.includes('Failed to fetch'))) {
    return 'Serveur API injoignable. Démarrez le backend : cd infrastructure && docker compose up -d';
  }
  return msg;
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await parseResponse(res);
  return { res, data };
}
