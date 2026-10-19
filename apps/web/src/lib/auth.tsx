import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

interface AuthState { token: string | null; user: any; org: any; ready: boolean; setAuth: (t: string, u: any, o: any) => void; logout: () => void }
const Ctx = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("hw_token"));
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setReady(true); return; }
      try { const r = await api.me(); setUser(r.user); setOrg(r.org); }
      catch { localStorage.removeItem("hw_token"); setToken(null); }
      finally { setReady(true); }
    })();
  }, [token]);

  const setAuth = (t: string, u: any, o: any) => { localStorage.setItem("hw_token", t); setToken(t); setUser(u); setOrg(o); };
  const logout = () => { localStorage.removeItem("hw_token"); setToken(null); setUser(null); setOrg(null); };

  return <Ctx.Provider value={{ token, user, org, ready, setAuth, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
