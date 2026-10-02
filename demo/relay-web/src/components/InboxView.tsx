import type { ReactNode } from "react";
import { IssueList } from "./IssueList";
import { ISSUES, MY_TEAM } from "@/data/issues";

/** The inbox as a pure function of its state. App owns the state, the clock and the keyboard shortcut. */
export function InboxView({
  greeting,
  focusMode,
  onQuickFind,
  onSettings,
  children,
}: {
  greeting: string;
  focusMode: boolean;
  onQuickFind: () => void;
  onSettings: () => void;
  /** Dialogs drawn over the inbox. */
  children?: ReactNode;
}) {
  const issues = focusMode ? ISSUES.filter((issue) => issue.team === MY_TEAM) : ISSUES;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 32px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>
          {greeting}, <span className="brand-gradient">here is your inbox</span>
        </h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <button className="card" style={buttonStyle} onClick={onQuickFind}>
            Quick find <kbd style={{ color: "var(--muted)" }}>Ctrl K</kbd>
          </button>
          <button className="card" style={buttonStyle} onClick={onSettings}>
            Settings
          </button>
        </nav>
      </header>
      <p style={{ color: "var(--muted)" }}>
        {focusMode ? `Focus mode: showing the ${MY_TEAM} team's issues` : "All open issues across every team"}
      </p>
      <IssueList issues={issues} />
      {children}
    </div>
  );
}

const buttonStyle = { color: "var(--text)", padding: "8px 14px", cursor: "pointer", font: "inherit" } as const;
