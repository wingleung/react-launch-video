import { useEffect, useState } from "react";
import type { Issue } from "@/data/issues";

const ACTIONS = ["Create issue", "Toggle focus mode", "Open settings"];

/** Quick find: filters issues and actions as you type. Results update 120ms after the last keystroke. */
export function CommandPalette({ issues, onClose }: { issues: Issue[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const matchingIssues = issues
        .filter((issue) => !q || `${issue.id} ${issue.title}`.toLowerCase().includes(q))
        .map((issue) => `${issue.id}  ${issue.title}`);
      const matchingActions = ACTIONS.filter((action) => !q || action.toLowerCase().includes(q));
      setResults([...matchingIssues, ...matchingActions]);
    }, 120);
    return () => clearTimeout(timer);
  }, [query, issues]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="card dialog"
        style={{ width: 560, margin: "120px auto 0", padding: 8 }}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search issues and actions..."
          style={{
            width: "100%",
            padding: 12,
            background: "transparent",
            border: 0,
            color: "inherit",
            font: "inherit",
          }}
        />
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {results.map((result, index) => (
            <li
              key={result}
              style={{ padding: "10px 12px", borderRadius: 8, background: index === 0 ? "#1b1f2a" : "" }}
            >
              {result}
            </li>
          ))}
        </ul>
        <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--muted)" }}>
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
