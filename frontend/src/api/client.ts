import axios from 'axios';

// Key used to persist the JWT in localStorage. Centralized here so
// login/register/logout code all reads and writes the same key.
export const AUTH_TOKEN_KEY = 'cleanconnect_token';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// SECURITY TRADE-OFF (explicit project decision for Module 2):
// The JWT is stored in localStorage and attached to every request here.
// localStorage is readable by any JavaScript running on the page, so if
// the app ever has an XSS vulnerability, an attacker-injected script
// could read this token directly and impersonate the user until it
// expires. The mitigating factors in this module are a short (1 hour)
// token lifetime and the absence of any HTML-injection sinks in the
// current UI. A more XSS-resistant alternative — an httpOnly cookie,
// which JavaScript cannot read at all — was deliberately deferred; it
// requires CSRF protection (SameSite/csrf-token handling) that is out
// of scope until a later module.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;
