import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export const colors = {
  border: "#EDEBE9", // Fluent Border
  text: "#323130", // Fluent Text Primary
  muted: "#605E5C", // Fluent Text Secondary
  soft: "#F3F2F1", // Fluent Gray Background
  primary: "#0078D4", // Microsoft Blue
  primaryHover: "#106EBE", // Microsoft Blue Hover
  success: "#107C10", // Fluent Green
  danger: "#D13438", // Fluent Red
  warning: "#D83B01", // Fluent Amber
};

export function Card({ children, style, id, className }: { children: ReactNode; style?: CSSProperties; id?: string; className?: string }) {
  return (
    <div
      id={id}
      className={className}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 24,
        background: "#ffffff",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
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
  variant?: "primary" | "secondary" | "success" | "outline" | "danger" | "ghost";
}) {
  const palette = {
    primary: { background: colors.primary, color: "#fff", border: "1px solid transparent" },
    secondary: { background: colors.soft, color: colors.text, border: `1px solid ${colors.border}` },
    success: { background: colors.success, color: "#fff", border: "1px solid transparent" },
    outline: { background: "transparent", color: colors.text, border: `1px solid ${colors.border}` },
    danger: { background: colors.danger, color: "#fff", border: "1px solid transparent" },
    ghost: { background: "transparent", color: colors.primary, border: "1px solid transparent" },
  }[variant];

  return (
    <button
      {...props}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 2,
        padding: "6px 16px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        transition: "all 0.2s",
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
    <label style={{ display: "grid", gap: 4, fontSize: 12, color: colors.text, fontWeight: 600 }}>
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
  variant = "solid",
  style
}: {
  children: ReactNode;
  color?: string;
  variant?: "solid" | "outline" | "soft";
  style?: CSSProperties;
}) {
  const styles = {
    solid: { background: color, color: "#fff", border: `1px solid ${color}` },
    outline: { background: "transparent", color: color, border: `1px solid ${color}` },
    soft: { background: `${color}18`, color: color, border: "1px solid transparent" },
  }[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        ...styles,
      }}
    >
      {children}
    </span>
  );
}

const controlStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid transparent",
  borderBottom: `1px solid #8A8886`,
  borderRadius: "2px 2px 0 0",
  padding: "6px 12px",
  fontSize: 14,
  color: colors.text,
  background: "#F3F2F1",
  transition: "all 0.2s",
  outline: "none",
};
