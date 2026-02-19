export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-text">Coming soon.</p>
    </div>
  );
}
