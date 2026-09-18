// Recreated from screenshots of the status page so we don't have to wire up the real app.
export function Dashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : "Good afternoon";
  return (
    <div
      style={{
        position: "absolute",
        left: 320,
        top: 140,
        width: 1590,
        height: 800,
        background: "#0b0b0d",
        borderRadius: 14,
      }}
    >
      <h1 style={{ color: "white", fontFamily: "Inter" }}>{greeting}</h1>
      <div style={{ position: "absolute", right: 24, top: 28, color: "#8b8b93", fontSize: 18 }}>Press ⌘K to search</div>
      <div className="card transition-all duration-300 animate-pulse" style={{ color: "white" }}>
        99.98% uptime across 214 services
      </div>
      <div className="card transition-all duration-300" style={{ color: "white" }}>
        Mean time to recovery: 4m 12s
      </div>
    </div>
  );
}
