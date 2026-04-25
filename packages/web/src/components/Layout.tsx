import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../lib/app-context";

const navItems: Array<{ to: string; label: string; signedInOnly?: boolean }> = [
  { to: "/", label: "Home" },
  { to: "/setup", label: "Setup" },
  { to: "/dashboard", label: "Dashboard", signedInOnly: true },
  { to: "/calendar", label: "Calendar", signedInOnly: true },
];

export function Layout() {
  const { idToken, account, login, logout, authError } = useApp();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#17201b]">
      <header className="sticky top-0 z-30 border-b border-[#ded6ca] bg-[#fffaf1]/95 backdrop-blur">
        <div className="mx-auto flex w-[min(1180px,calc(100vw-32px))] flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink className="flex items-baseline gap-2 tracking-tight" to="/">
            <span className="text-base font-black">Voicebox</span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#66746d]">by APPGAMBiT</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            {navItems
              .filter((item) => !item.signedInOnly || idToken)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-extrabold ${
                      isActive ? "bg-[#0d6b57] text-white" : "text-[#38473f] hover:bg-[#f7f4ee]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            {idToken ? (
              <div className="ml-2 flex items-center gap-2 border-l border-[#e0d8cc] pl-3">
                <span className="hidden text-xs font-bold text-[#66746d] sm:inline">{account?.email || "Signed in"}</span>
                <button
                  className="min-h-9 rounded-lg border border-[#bdcbc4] bg-white px-3 text-sm font-extrabold"
                  type="button"
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                className="ml-2 min-h-9 rounded-lg bg-[#0d6b57] px-3 text-sm font-extrabold text-white"
                type="button"
                onClick={login}
              >
                Sign in
              </button>
            )}
          </nav>
        </div>
        {authError ? (
          <div className="border-t border-[#f0c6bc] bg-[#fff0ee] px-4 py-2 text-center text-sm text-[#8c2a18]">
            {authError}
          </div>
        ) : null}
      </header>
      <main key={location.pathname}>
        <Outlet />
      </main>
      <footer className="border-t border-[#ded6ca] bg-[#fffaf1]">
        <div className="mx-auto flex w-[min(1180px,calc(100vw-32px))] flex-col items-center justify-between gap-2 py-6 text-sm text-[#66746d] sm:flex-row">
          <span>© {new Date().getFullYear()} APPGAMBiT · Voicebox</span>
          <span>Voice booking for Indian SMBs</span>
        </div>
      </footer>
    </div>
  );
}
