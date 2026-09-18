import { useEffect, useState } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { IssueList } from "./components/IssueList";
import { SettingsDialog } from "./components/SettingsDialog";
import { ISSUES, MY_TEAM } from "./data/issues";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function App() {
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const issues = focusMode ? ISSUES.filter((issue) => issue.team === MY_TEAM) : ISSUES;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 32px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>
          {greeting()}, <span className="brand-gradient">here is your inbox</span>
        </h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <button className="card" style={buttonStyle} onClick={() => setPaletteOpen(true)}>
            Quick find <kbd style={{ color: "var(--muted)" }}>Ctrl K</kbd>
          </button>
          <button className="card" style={buttonStyle} onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </nav>
      </header>
      <p style={{ color: "var(--muted)" }}>
        {focusMode ? `Focus mode: showing the ${MY_TEAM} team's issues` : "All open issues across every team"}
      </p>
      <IssueList issues={issues} />
      {settingsOpen && (
        <SettingsDialog focusMode={focusMode} onFocusModeChange={setFocusMode} onClose={() => setSettingsOpen(false)} />
      )}
      {paletteOpen && <CommandPalette issues={ISSUES} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

const buttonStyle = { color: "var(--text)", padding: "8px 14px", cursor: "pointer", font: "inherit" } as const;
