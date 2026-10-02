import { MY_TEAM } from "@/data/issues";

export function SettingsDialog({
  focusMode,
  onFocusModeChange,
  onClose,
}: {
  focusMode: boolean;
  onFocusModeChange: (value: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div style={overlay} onClick={onClose}>
      <div className="card dialog" style={{ width: 460, padding: 24 }} onClick={(event) => event.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={focusMode} onChange={(event) => onFocusModeChange(event.target.checked)} />
          <span>
            <strong>Focus mode</strong>
            <br />
            <span style={{ color: "var(--muted)" }}>Only show issues assigned to the {MY_TEAM} team.</span>
          </span>
        </label>
        <button className="card" style={{ marginTop: 20, padding: "8px 14px", color: "var(--text)" }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)",
  display: "grid",
  placeItems: "center",
} as const;
