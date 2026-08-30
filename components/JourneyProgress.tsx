export function JourneyProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    { number: 1, label: "Search" },
    { number: 2, label: "Confirm" },
    { number: 3, label: "Review" },
    { number: 4, label: "Email" },
  ];

  return (
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
  );
}