const DEFAULT_BASE_URL = '/api/v1/';

export async function apiClient(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
  } = options;

  let authHeaders = {};
  try {
    const stored = localStorage.getItem('wms-auth');
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore
  }

  const envBase =
    import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;
  const baseUrl = envBase.endsWith('/') ? envBase : `${envBase}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  // Reduced to pure real API call
  // console.log('[API Client] Calling:', normalizedPath);

  // Ensure baseUrl is absolute by resolving against window.location.origin if it's relative
  const validBaseUrl = new URL(baseUrl, window.location.origin);
  const url = new URL(normalizedPath, validBaseUrl);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, value);
      }
    });
  }

  /* Determine headers. If body is FormData, let browser set Content-Type */
  const finalHeaders = { ...authHeaders, ...headers };
  let finalBody = body;

  if (body instanceof FormData) {
    // Browser sets multipart/form-data with boundary
  } else {
    finalHeaders['Content-Type'] = 'application/json';
    if (body) {
      finalBody = JSON.stringify(body);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error?.message || data.message || JSON.stringify(data);
      if (data.error?.details) {
        // Attach details to the message or error object for UI to use
        const error = new Error(message);
        error.details = data.error.details;
        error.code = data.error.code;
        throw error;
      }
    } catch (e) {
      if (e.message && e.details) throw e; // Re-throw if we just created it
      message = await response.text();
    }
    throw new Error(message || 'Request failed');
  }

  if (options.responseType === 'blob') {
    return response.blob();
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// Add helper methods
apiClient.get = (path, options = {}) => apiClient(path, { ...options, method: 'GET' });
apiClient.post = (path, body, options = {}) => apiClient(path, { ...options, method: 'POST', body });
apiClient.put = (path, body, options = {}) => apiClient(path, { ...options, method: 'PUT', body });
apiClient.patch = (path, body, options = {}) => apiClient(path, { ...options, method: 'PATCH', body });
apiClient.delete = (path, options = {}) => apiClient(path, { ...options, method: 'DELETE' });

