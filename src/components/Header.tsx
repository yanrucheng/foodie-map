interface HeaderProps {
  title: string;
  subtitle: string;
}

/** Page header with title and subtitle. Renders dynamic city/guide metadata. */
export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="title">{title}</h1>
      <p className="subtitle">{subtitle}</p>
    </header>
  );
}
