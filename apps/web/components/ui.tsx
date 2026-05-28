import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const colors = {
  border: "#e8e8e8",
  text: "#111",
  muted: "#666",
  soft: "#f8f9fa",
};

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 14,
        background: "#fff",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success";
}) {
  const palette = {
    primary: { background: "#111", color: "#fff" },
    secondary: { background: colors.soft, color: colors.text },
    success: { background: "#16a34a", color: "#fff" },
  }[variant];

  return (
    <button
      {...props}
      style={{
        border: 0,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 700,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...palette,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#555", fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...controlStyle, ...props.style }} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...controlStyle, minHeight: 84, resize: "vertical", ...props.style }} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...controlStyle, ...props.style }} />;
}

export function Badge({
  children,
  color = colors.muted,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        borderRadius: 999,
        padding: "4px 9px",
        background: `${color}18`,
        color,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

const controlStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid #ddd`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  background: "#fff",
};
