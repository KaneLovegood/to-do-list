let accessTokenInMemory: string | null = null;
let onAuthFailureCallback: (() => void) | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export const setAccessToken = (token: string | null) => {
  accessTokenInMemory = token;
};

export const getAccessToken = () => accessTokenInMemory;

export const registerAuthFailureCallback = (callback: () => void) => {
  onAuthFailureCallback = callback;
};

async function handleRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const token = data.accessToken;
      setAccessToken(token);
      
      // Resolve all queued requests with the new token
      refreshQueue.forEach((callback) => callback(token));
      refreshQueue = [];
      return token;
    } else {
      setAccessToken(null);
      if (onAuthFailureCallback) {
        onAuthFailureCallback();
      }
      refreshQueue = [];
      return null;
    }
  } catch {
    setAccessToken(null);
    if (onAuthFailureCallback) {
      onAuthFailureCallback();
    }
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Attach access token if present
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const updatedInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, updatedInit);

  // If unauthorized, attempt to silent refresh (except for login/register/refresh endpoints)
  const urlString = typeof input === 'string' ? input : input.toString();
  const isAuthRoute =
    urlString.includes('/api/auth/register') ||
    urlString.includes('/api/auth/verify-registration') ||
    urlString.includes('/api/auth/login') ||
    urlString.includes('/api/auth/refresh');

  if (response.status === 401 && !isAuthRoute) {
    const newToken = await handleRefresh();
    if (newToken) {
      // Retry the request with the new access token
      const retryHeaders = new Headers(updatedInit.headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      return fetch(input, {
        ...updatedInit,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
