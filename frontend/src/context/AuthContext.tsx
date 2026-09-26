import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { PublicUser } from '../api/auth';
import { AUTH_TOKEN_KEY } from '../api/client';

// This project had no frontend auth UI before Module 5 — Module 2's
// login/register/JWT logic only existed on the backend. This context
// is the minimal piece needed so the complaint flow (which requires
// an authenticated citizen) is actually usable from the UI, without
// touching any backend auth code (JWT signing, password hashing,
// authenticate/authorize middleware are all untouched — see the
// Module 5 report).
interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .getCurrentUser()
      .then(setUser)
      .catch(() => {
        // Stored token is invalid/expired — clear it rather than
        // leaving the app thinking the user is signed in.
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await authApi.login({ email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    setUser(result.user);
  }

  async function register(name: string, email: string, password: string) {
    const result = await authApi.register({ name, email, password });
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
