import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_LOGOUT_EVENT, AUTH_STORAGE_KEY } from "../constants";
import type { AuthResponse, StoredSession, User } from "../interfaces";
import { getCurrentUser } from "../services/userService";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (auth: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(readSession);
  // A stored session is re-checked against /me before guards trust it.
  const [isLoading, setIsLoading] = useState(() => session !== null);

  const applySession = useCallback((next: StoredSession | null) => {
    writeSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    const stored = readSession();
    if (!stored) return;
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) applySession({ token: stored.token, user });
      })
      .catch(() => {
        if (!cancelled) applySession(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  useEffect(() => {
    // apiClient fires this when the server rejects the token.
    const handleForcedLogout = () => setSession(null);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      isAdmin: session?.user.role === "admin",
      isLoading,
      login: (auth) => applySession({ token: auth.access_token, user: auth.user }),
      logout: () => {
        applySession(null);
        queryClient.removeQueries({ queryKey: ["admin"] });
      },
      updateUser: (user) =>
        setSession((current) => {
          if (!current) return current;
          const next = { ...current, user };
          writeSession(next);
          return next;
        }),
    }),
    [session, isLoading, applySession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
