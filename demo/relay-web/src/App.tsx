import { useEffect, useState } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { InboxView } from "./components/InboxView";
import { SettingsDialog } from "./components/SettingsDialog";
import { ISSUES } from "./data/issues";

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

  const openResult = (result: string) => {
    if (result === "Toggle focus mode") setFocusMode((on) => !on);
    else if (result === "Open settings") setSettingsOpen(true);
  };

  return (
    <InboxView
      greeting={greeting()}
      focusMode={focusMode}
      onQuickFind={() => setPaletteOpen(true)}
      onSettings={() => setSettingsOpen(true)}
    >
      {settingsOpen && (
        <SettingsDialog focusMode={focusMode} onFocusModeChange={setFocusMode} onClose={() => setSettingsOpen(false)} />
      )}
      {paletteOpen && <CommandPalette issues={ISSUES} onOpen={openResult} onClose={() => setPaletteOpen(false)} />}
    </InboxView>
  );
}
