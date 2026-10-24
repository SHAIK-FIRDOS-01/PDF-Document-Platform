/**
 * Normalizes document and media URLs for both local development and production.
 * - Leaves absolute URLs intact (upgrading http to https on secure connections).
 * - Prepends VITE_API_URL to relative paths (e.g. /media/documents/sample.pdf).
 * - Fallbacks safely for falsy values.
 */
export const getMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // If already an absolute URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      trimmed.startsWith('http://')
    ) {
      return trimmed.replace('http://', 'https://');
    }
    return trimmed;
  }

  // Prepend backend API base URL if configured (from VITE_API_URL)
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${apiBase}${cleanPath}`;
};

export default getMediaUrl;
