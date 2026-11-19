export function SafeStepsRenderer({ content }: { content: string | null | undefined }) {
  if (!content?.trim()) return null;
  const lines = content.split(/\r?\n/);

  return (
    <div className="space-y-2 text-body-md text-on-surface">
      {lines.map((raw, idx) => {
        const line = raw.trim();
        if (!line) return <div key={idx} className="h-1" />;
        if (line.startsWith('## ')) {
          return (
            <h4 key={idx} className="text-title-sm text-primary font-bold pt-2 border-b border-surface-container-high pb-1">
              {line.slice(3)}
            </h4>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0" />
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        const numMatch = /^(\d+)\)\s*(.+)$|^(\d+)\.\s*(.+)$/.exec(line);
        if (numMatch) {
          const num = numMatch[1] || numMatch[3];
          const text = numMatch[2] || numMatch[4];
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-label-sm flex items-center justify-center shrink-0 mt-0.5">
                {num}
              </span>
              <span>{text}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="text-on-surface-variant">
            {line}
          </p>
        );
      })}
    </div>
  );
}
