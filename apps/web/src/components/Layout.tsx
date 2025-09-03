import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  const linkBase =
    "px-4 py-2 rounded-xl transition font-medium";
  const linkActive =
    "bg-white/10";
  const linkIdle =
    "hover:bg-white/5";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <div className="text-lg font-semibold">TrustSwap</div>
          <nav className="flex gap-2">
            <NavLink
              to="/swap"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkIdle}`
              }
            >
              Swap
            </NavLink>
            <NavLink
              to="/pools"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkIdle}`
              }
            >
              Pools
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
