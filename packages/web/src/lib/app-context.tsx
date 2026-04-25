import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Account, currentMonthRange, DateRange, fetchJson, startLogin, tokenFromHash, tokenKey } from "./api";

type AppContextValue = {
  idToken: string;
  account: Account | null;
  range: DateRange;
  setRange: (range: DateRange) => void;
  refreshNonce: number;
  triggerRefresh: () => void;
  login: () => void;
  logout: () => void;
  authError: string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [idToken, setIdToken] = useState(() => localStorage.getItem(tokenKey) || "");
  const [account, setAccount] = useState<Account | null>(null);
  const [range, setRange] = useState<DateRange>(() => currentMonthRange());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const token = tokenFromHash();
    if (!token) return;
    localStorage.setItem(tokenKey, token);
    setIdToken(token);
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (!idToken) {
      setAccount(null);
      return;
    }
    fetchJson<{ account: Account }>("/me", idToken)
      .then((response) => setAccount(response.account))
      .catch(() => {
        localStorage.removeItem(tokenKey);
        setIdToken("");
        setAccount(null);
      });
  }, [idToken]);

  const login = useCallback(() => {
    try {
      setAuthError("");
      startLogin();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not start login");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setIdToken("");
    setAccount(null);
  }, []);

  const triggerRefresh = useCallback(() => setRefreshNonce((value) => value + 1), []);

  const value = useMemo<AppContextValue>(
    () => ({ idToken, account, range, setRange, refreshNonce, triggerRefresh, login, logout, authError }),
    [idToken, account, range, refreshNonce, triggerRefresh, login, logout, authError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
