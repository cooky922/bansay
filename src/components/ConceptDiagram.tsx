import type { ConceptPackDiagram } from "../types/bansay";

export function ConceptDiagram({ diagram }: { diagram: ConceptPackDiagram }) {
  const items = diagram.items || [];

  return (
    <figure className="rounded-xl border border-bansay-line bg-bansay-tint p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-bansay-strong">{diagram.title}</p>
        <figcaption className="text-xs leading-relaxed text-slate-600">
          {diagram.caption}
        </figcaption>
      </div>

      {diagram.template === "two-panel-comparison" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.slice(0, 2).map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-4 space-y-1.5"
            >
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      {diagram.template === "process-flow" && (
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3.5 space-y-1">
                <p className="text-xs font-semibold text-slate-500 tabular-nums">
                  {idx + 1}. {item.label}
                </p>
                <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
              </div>
              {idx < items.length - 1 && (
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center text-bansay-action py-0.5 sm:px-0.5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 rotate-90 sm:rotate-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {diagram.template === "cycle" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 bg-white p-3.5 flex items-start gap-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bansay-line bg-white text-xs font-bold text-bansay-strong tabular-nums">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      → {items[(idx + 1) % items.length]?.label}
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center">
            Cycle continues back to step 1 ({items[0]?.label}).
          </p>
        </div>
      )}

      {diagram.template === "labeled-parts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-3.5 flex items-start gap-2.5"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-bansay-action"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-sm leading-relaxed text-slate-700">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {diagram.template === "number-line" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <svg
            viewBox="0 0 600 64"
            className="w-full h-16 overflow-visible"
            role="img"
            aria-label={diagram.title}
          >
            <line x1="32" y1="28" x2="568" y2="28" stroke="var(--bansay-muted)" strokeWidth="2" />
            <path d="M562 22 L572 28 L562 34" fill="none" stroke="var(--bansay-muted)" strokeWidth="2" />
            <path d="M38 22 L28 28 L38 34" fill="none" stroke="var(--bansay-muted)" strokeWidth="2" />
            {items.map((item, idx) => {
              const x =
                items.length === 1
                  ? 300
                  : 56 + (idx * (544 - 56)) / (items.length - 1);
              return (
                <g key={idx}>
                  <line x1={x} y1="19" x2={x} y2="37" stroke="var(--bansay-brand)" strokeWidth="2" />
                  <circle cx={x} cy="28" r="4.5" fill="var(--bansay-brand)" />
                  <text
                    x={x}
                    y="54"
                    textAnchor="middle"
                    fill="var(--bansay-text)"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {item.label.slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-100 pt-3">
            {items.map((item, idx) => (
              <div key={idx} className="text-xs leading-relaxed text-slate-700">
                <strong className="text-slate-900">{item.label}:</strong> {item.detail}
              </div>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
