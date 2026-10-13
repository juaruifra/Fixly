const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {}
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response.text();
  }

  return response.json();
}

export const servicesApi = {
  list: (params = {}) => request(`/services${buildQueryString(params)}`),
  listPublic: () => request('/services/public'),
  getBySlug: (slug) => request(`/services/slug/${encodeURIComponent(slug)}`),
  get: (id) => request(`/services/${id}`),
  create: (data) => request('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  remove: (id) => request(`/services/${id}`, {
    method: 'DELETE',
  }),
  restore: (id) => request(`/services/${id}/restore`, {
    method: 'PATCH',
  }),
  setActive: (id, active) => request(`/services/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  }),
  setStatus: (id, status) => request(`/services/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};
