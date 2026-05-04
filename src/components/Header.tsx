interface HeaderProps {
  title: string;
  subtitle: string;
  /** When true, renders compact single-line header for mobile. */
  compact?: boolean;
}

/**
 * Page header with title and subtitle. On mobile (compact=true), renders
 * a single-line truncated title with subtitle hidden by default.
 */
export function Header({ title, subtitle, compact }: HeaderProps) {
  return (
    <header className={`header ${compact ? "header--compact" : ""}`}>
      <h1 className="title">{title}</h1>
      {!compact && <p className="subtitle">{subtitle}</p>}
    </header>
  );
}
