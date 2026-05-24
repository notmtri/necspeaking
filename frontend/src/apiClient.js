import { API_BASE_URL } from './appShared';

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const isAbortError = (error) => error?.name === 'AbortError';

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfToken = '';

function readCookie(name) {
  const escapedName = name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function rememberCsrfToken(response) {
  const headerToken = response.headers.get('X-CSRF-Token');
  if (headerToken) {
    csrfToken = headerToken;
  }
}

async function fetchCsrfToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      credentials: 'include',
    });
    rememberCsrfToken(response);
  } catch {
    // The main request will surface the connection error.
  }
}

export async function apiFetch(path, options = {}) {
  const {
    body,
    headers,
    parseJson = true,
    ...rest
  } = options;

  const requestHeaders = new Headers(headers || {});
  const isFormData = body instanceof FormData;
  const method = String(rest.method || 'GET').toUpperCase();

  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (MUTATING_METHODS.has(method) && !requestHeaders.has('X-CSRF-Token')) {
    const token = csrfToken || readCookie('csrf_token');
    if (token) {
      requestHeaders.set('X-CSRF-Token', token);
    } else {
      await fetchCsrfToken();
      const refreshedToken = csrfToken || readCookie('csrf_token');
      if (refreshedToken) {
        requestHeaders.set('X-CSRF-Token', refreshedToken);
      }
    }
  }

  const fetchOptions = {
    credentials: 'include',
    ...rest,
    headers: requestHeaders,
    body: body !== undefined && !isFormData && typeof body !== 'string'
      ? JSON.stringify(body)
      : body,
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
    rememberCsrfToken(response);
    if (response.status === 403 && MUTATING_METHODS.has(method)) {
      const retryToken = csrfToken || readCookie('csrf_token');
      if (retryToken && retryToken !== requestHeaders.get('X-CSRF-Token')) {
        requestHeaders.set('X-CSRF-Token', retryToken);
        response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);
        rememberCsrfToken(response);
      }
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError('Could not reach the backend service. Check your connection and backend server.', { status: 0 });
  }

  if (!parseJson) {
    if (!response.ok) {
      throw new ApiError(response.statusText || 'Request failed.', { status: response.status });
    }
    return response;
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { error: text } : null;
  }

  if (!response.ok) {
    throw new ApiError(data?.error || data?.message || `Request failed with status ${response.status}.`, {
      status: response.status,
      data,
    });
  }

  return data;
}

export async function waitForAnalysisJob(jobId, options = {}) {
  const {
    signal,
    intervalMs = 2000,
    maxWaitMs = 8 * 60 * 1000,
    onTick,
  } = options;
  const startedAt = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const data = await apiFetch(`/api/analyze/jobs/${jobId}`, { signal });
    const job = data.job;
    onTick?.(job);

    if (job?.status === 'completed') {
      return job;
    }

    if (job?.status === 'failed') {
      throw new ApiError(job.error || 'Analysis job failed.', {
        status: 500,
        data: job,
      });
    }

    if (Date.now() - startedAt > maxWaitMs) {
      throw new ApiError('Analysis is taking too long. If this is production, check that the analysis worker is running.', {
        status: 408,
        data: job,
      });
    }

    await sleep(intervalMs);
  }
}
