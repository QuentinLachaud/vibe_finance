import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function PlaceholderPage({ title }: { title: string }) {
  useDocumentTitle(`${title} | TakeHomeCalc`);
  return (
    <div className="placeholder-page">
      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-text">Coming soon.</p>
    </div>
  );
}
