import type { Platform } from "../types";

export function Filters({
  active,
  onToggle,
}: {
  active: Record<Platform, boolean>;
  onToggle: (p: Platform) => void;
}) {
  const platforms: Platform[] = ["twitch", "youtube", "kick"];
  return (
    <div className="filters">
      {platforms.map((p) => (
        <label key={p} className={`filter-chip ${active[p] ? "on" : "off"}`}>
          <input type="checkbox" checked={active[p]} onChange={() => onToggle(p)} />
          {p}
        </label>
      ))}
    </div>
  );
}
