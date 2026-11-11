import { API_BASE_URL } from './config.js';
import { getToken, clearSession } from './session.js';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }
  return url;
}

async function decodeResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) return response.text();
  return response.blob();
}

export async function request(path, options = {}) {
  const {
    method = 'GET', body, params, auth = true, headers = {}, responseType = 'json',
    redirectOnUnauthorized = true
  } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', responseType === 'json' ? 'application/json' : '*/*');

  if (auth) {
    const token = getToken();
    if (!token) {
      if (redirectOnUnauthorized && !location.pathname.endsWith('/login.html')) {
        location.replace('login.html');
      }
      throw new ApiError('Sua sessão não está ativa. Faça login novamente.', 401);
    }
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let requestBody = body;
  if (body && !(body instanceof FormData) && !(body instanceof URLSearchParams) && typeof body !== 'string') {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: 'omit'
    });
  } catch (error) {
    throw new ApiError(`Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o backend está rodando e se a URL está correta.`, 0, error);
  }

  const data = responseType === 'blob' ? await response.blob() : await decodeResponse(response);
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null
      ? (data.mensagem || data.message || 'A API não conseguiu concluir a solicitação.')
      : (typeof data === 'string' && data ? data : 'A API não conseguiu concluir a solicitação.');

    if (response.status === 401 && auth) {
      clearSession();
      if (redirectOnUnauthorized && !location.pathname.endsWith('/login.html')) {
        alert('Sua sessão expirou ou não é mais válida. Entre novamente.');
        location.replace('login.html');
      }
    }
    throw new ApiError(message, response.status, data?.detalhes || null);
  }
  return data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
  file: (path, params) => request(path, { params, responseType: 'blob' })
};

export function publicFileUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
