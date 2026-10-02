import type { Issue, Status } from "@/data/issues";

const COLUMNS: Status[] = ["Todo", "In progress", "Done"];

export function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 24 }}>
      {COLUMNS.map((status) => (
        <section key={status}>
          <h2 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            {status}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {issues
              .filter((issue) => issue.status === status)
              .map((issue) => (
                <li key={issue.id} className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {issue.id} · {issue.team}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{issue.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{issue.assignee}</div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
