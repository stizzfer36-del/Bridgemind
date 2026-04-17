import { THEMES, useTheme } from "../state/theme";

export default function ThemePicker() {
  const current = useTheme((s) => s.current);
  const setCurrent = useTheme((s) => s.setCurrent);

  return (
    <div className="themepicker">
      <select
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        aria-label="theme"
      >
        {THEMES.map((t) => (
          <option key={t.name} value={t.name}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
