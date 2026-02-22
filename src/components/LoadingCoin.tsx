/**
 * Reusable animated gold coin loader.
 * Used as Suspense fallback for lazy routes and inline loading states.
 */
export function LoadingCoin({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="loading-coin-wrapper">
      <div className="rp-coin-loader">
        <div className="rp-coin">
          <div className="rp-coin-face rp-coin-front">£</div>
          <div className="rp-coin-face rp-coin-back">$</div>
        </div>
        <p className="rp-coin-text">{text}</p>
      </div>
    </div>
  );
}
