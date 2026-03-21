import { createContext, useContext, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";

export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  roles: string[];
}

export function hasRole(user: AuthUser | null, ...roles: string[]): boolean {
  return roles.some((r) => user?.roles?.includes(r) ?? false);
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { access_token, user: userData } = response.data;
    localStorage.setItem("auth_token", access_token);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
