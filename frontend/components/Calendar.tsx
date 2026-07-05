const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type CalendarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function Calendar({ value, onChange }: CalendarProps) {
  const selected = new Date(`${value}T12:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingDays = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const setDay = (day: number) => {
    const monthPart = String(month + 1).padStart(2, "0");
    const dayPart = String(day).padStart(2, "0");
    onChange(`${year}-${monthPart}-${dayPart}`);
  };

  return (
    <section className="calendar" aria-label="Calendar">
      <div className="calendar__month" suppressHydrationWarning>
        {selected.toLocaleDateString("en-US", { month: "long" })}
      </div>
      <div className="calendar__grid calendar__weekdays" aria-hidden="true">
        {weekDays.map((day) => (
          <span key={day} className={day === "Sa" || day === "Su" ? "weekend" : ""}>
            {day}
          </span>
        ))}
      </div>
      <div className="calendar__grid">
        {cells.map((day, index) =>
          day ? (
            <button
              key={day}
              type="button"
              className={`${day === selected.getDate() ? "is-selected" : ""} ${(index % 7) > 4 ? "weekend" : ""}`}
              aria-label={`Select ${day} ${selected.toLocaleDateString("en-US", { month: "long" })}`}
              aria-pressed={day === selected.getDate()}
              onClick={() => setDay(day)}
            >
              {day}
            </button>
          ) : (
            <span key={`empty-${index}`} aria-hidden="true" />
          ),
        )}
      </div>
    </section>
  );
}
