interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-[24px] w-[44px] shrink-0 rounded-full border transition-colors disabled:opacity-50"
      style={{
        background: checked ? "var(--accent)" : "var(--surface-2)",
        borderColor: checked ? "transparent" : "var(--border)",
      }}
    >
      <span
        className="absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform"
        style={{
          transform: checked ? "translateX(20px)" : "none",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.28)",
        }}
      />
    </button>
  );
}
