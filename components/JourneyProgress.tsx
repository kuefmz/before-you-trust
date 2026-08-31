export function JourneyProgress({
  step,
  onStartNewSearch,
  onToggleManualSearch,
  manualSearchOpen = false,
  highlightManualSearch = false,
}: {
  step: 1 | 2 | 3 | 4;
  onStartNewSearch?: () => void;
  onToggleManualSearch?: () => void;
  manualSearchOpen?: boolean;
  highlightManualSearch?: boolean;
}) {
  const steps = [
    { number: 1, label: "Search" },
    { number: 2, label: "Confirm" },
    { number: 3, label: "Review" },
    { number: 4, label: "Email" },
  ];

  return (
    <div className="journey-toolbar">
      <ol aria-label="Search journey" className="journey-progress">
        {steps.map((item) => (
          <li
            className={item.number <= step ? "journey-progress__active" : ""}
            key={item.number}
          >
            <span>{item.number}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>

      {(onStartNewSearch || onToggleManualSearch) ? (
        <div className="journey-toolbar__actions">
          {onStartNewSearch ? (
            <button
              className={`button button--compact ${
                highlightManualSearch
                  ? "button--primary button--manual-highlight"
                  : "button--ghost"
              }`}
              onClick={onStartNewSearch}
              type="button"
            >
              Start new search
            </button>
          ) : null}
          {onToggleManualSearch ? (
            <button
              aria-controls="manual-search-panel"
              aria-expanded={manualSearchOpen}
              className="button button--ghost button--compact"
              onClick={onToggleManualSearch}
              type="button"
            >
              {manualSearchOpen ? "Hide DIY search" : "Do it yourself"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
