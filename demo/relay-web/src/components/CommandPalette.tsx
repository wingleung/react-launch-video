import { useEffect, useState, type KeyboardEvent } from "react";
import type { Issue } from "@/data/issues";

const ACTIONS = ["Create issue", "Toggle focus mode", "Open settings"];

/** Quick find: filters issues and actions as you type. Results update 120ms after the last keystroke. */
export function CommandPalette({
  issues,
  onOpen,
  onClose,
}: {
  issues: Issue[];
  onOpen: (result: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();
      const matchingIssues = issues
        .filter((issue) => !q || `${issue.id} ${issue.title}`.toLowerCase().includes(q))
        .map((issue) => `${issue.id}  ${issue.title}`);
      const matchingActions = ACTIONS.filter((action) => !q || action.toLowerCase().includes(q));
      setResults([...matchingIssues, ...matchingActions]);
      setSelected(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [query, issues]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSelected((index) => Math.min(Math.max(index + step, 0), Math.max(results.length - 1, 0)));
    } else if (event.key === "Enter") {
      const result = results[selected];
      if (result !== undefined) {
        onOpen(result);
        onClose();
      }
    } else if (event.key === "Escape") {
      onClose();
    }
  };

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
          onKeyDown={onKeyDown}
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
              style={{ padding: "10px 12px", borderRadius: 8, background: index === selected ? "#1b1f2a" : "" }}
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
