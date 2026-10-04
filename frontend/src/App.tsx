import { useCallback, useEffect, useRef, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { domains, kinds } from "./domains";
import { QuickCapture } from "./components";
import { Dashboard } from "./Dashboard";
import { RecordsPage } from "./RecordsPage";
import { SearchPage } from "./SearchPage";
import { SettingsPage } from "./SettingsPage";
import { useShortcuts } from "./shortcuts";

export function App() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  useEffect(() => {
    setSearch(params.get("q") ?? "");
  }, [params]);
  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);
  const focusCapture = useCallback(
    () => document.getElementById("quick-capture")?.focus(),
    [],
  );
  useShortcuts(focusSearch, focusCapture);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">⌘</span>
          <span>
            Personal
            <br />
            <strong>Command Center</strong>
          </span>
        </NavLink>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          {(["inbox", ...kinds.filter((k) => k !== "inbox")] as const).map(
            (kind) => (
              <NavLink key={kind} to={`/${kind}`}>
                {domains[kind].label}
              </NavLink>
            ),
          )}
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" /> Local. Private. Yours.
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/search?q=${encodeURIComponent(search)}`);
            }}
          >
            <label className="sr-only" htmlFor="global-search">
              Search everything
            </label>
            <input
              id="global-search"
              ref={searchRef}
              value={search}
              maxLength={500}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search everything…"
            />
            <button className="quiet">
              Search <kbd>⌘ K</kbd>
            </button>
          </form>
        </header>
        <main id="main">
          <QuickCapture />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {kinds.map((kind) => (
              <Route
                key={kind}
                path={`/${kind}/:id?`}
                element={<RecordsPage key={kind} kind={kind} />}
              />
            ))}
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <p>
                  Page not found. <NavLink to="/">Return home</NavLink>
                </p>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
