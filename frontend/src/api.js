// frontend/src/api.js

// Use relative path in production to leverage Vercel's vercel.json reverse proxy,
// avoiding CORS issues. Use VITE_API_URL or localhost in development.
let baseUrl = "";
if (import.meta.env.DEV) {
  baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
}

export const API_BASE = baseUrl;

/**
 * Normalizes an API path and returns the full URL.
 * Ensures that the path starts with a single slash.
 * Examples:
 *   getApiUrl('api/events') -> 'https://domain.com/api/events'
 *   getApiUrl('/api/events') -> 'https://domain.com/api/events'
 */
export const getApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  console.log(`[API REQUEST] => ${url}`);
  return url;
};
