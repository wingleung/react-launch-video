import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUE, SERVICES } from "../timeline";
import { Palette } from "./Palette";

const INCIDENTS = [
  { service: "checkout-005", summary: "Elevated error rate on payments" },
  { service: "search-004", summary: "Slow queries in the EU region" },
  { service: "notify-007", summary: "Delayed email delivery" },
];

// Recreated from screenshots of the status page so we don't have to wire up the real app.
export function Dashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
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
      <div style={{ position: "absolute", right: 24, top: 28, color: "#8b8b93", fontSize: 18 }}>Press ⌘K to search</div>
      {t < CUE.newPage ? (
        <>
          <h1 style={{ color: "white", fontFamily: "Inter" }}>{greeting}</h1>
          <table style={{ position: "absolute", left: 40, top: 80, width: 700, color: "white", fontSize: 22 }}>
            <tbody>
              {INCIDENTS.map((incident, index) => (
                <tr
                  key={incident.service}
                  style={{ height: 40, background: index === 0 && t >= CUE.incidentOpen ? "#3a1d1d" : "transparent" }}
                >
                  <td>{incident.service}</td>
                  <td>{incident.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ position: "absolute", left: 40, top: 300 }}>
            <div className="card transition-all duration-300 animate-pulse" style={{ color: "white" }}>
              99.98% uptime across {SERVICES} services
            </div>
            <div className="card transition-all duration-300" style={{ color: "white" }}>
              Mean time to recovery: 4m 12s
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 style={{ color: "white", fontFamily: "Inter" }}>Services</h1>
          <Palette />
        </>
      )}
    </div>
  );
}
