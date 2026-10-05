import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const ACCESS_TOKEN_KEY = 'vanella_access_token';
const REFRESH_TOKEN_KEY = 'vanella_refresh_token';

// "customer", "staff", "driver" or "admin": decides which screens open.
const ROLE_KEY = 'vanella_role';

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

// `role` is only given at login; a token refresh keeps the stored one.
export async function setTokens({ accessToken, refreshToken, role }) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

  if (role) {
    await SecureStore.setItemAsync(ROLE_KEY, role);
  }
}

// Phones that logged in before roles existed are customers.
export async function getRole() {
  return (await SecureStore.getItemAsync(ROLE_KEY)) || 'customer';
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    // Validation errors (422) send `detail` as a list, not a message.
    if (typeof data.detail === 'string') return data.detail;
    return 'Something went wrong. Please try again.';
  } catch {
    return 'Something went wrong. Please try again.';
  }
}

const REQUEST_TIMEOUT_MS = 15000;

async function rawFetch(path, options = {}) {
  // Without a timeout, an unreachable backend leaves the request hanging.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await rawFetch('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    await clearTokens();
    return null;
  }

  const data = await response.json();

  await setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return data.access_token;
}

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response = await rawFetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      response = await rawFetch(path, {
        method,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;

  return response.json();
}