import type { ReactNode } from "react";

interface HeaderProps {
  /** Title area — accepts a ReactNode (e.g. DynamicTitle) or a plain string. */
  children?: ReactNode;
  subtitle: string;
  /** When true, renders compact single-line header for mobile. */
  compact?: boolean;
}

/**
 * Page header with a configurable title slot and subtitle.
 * On mobile (compact=true), renders a single-line layout with subtitle hidden.
 */
export function Header({ children, subtitle, compact }: HeaderProps) {
  return (
    <header className={`header ${compact ? "header--compact" : ""}`}>
      {children}
      {!compact && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
