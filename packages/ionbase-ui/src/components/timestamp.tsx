import React from 'react';

/**
 * A real `<time>` for an instant: `dateTime` is exact, whatever the label
 * says, so a label can be relative ("2 hours ago") without losing it. The
 * default label is a medium date and a short time. Internal — Timeline and
 * ChatMessage share it, so the two never format a time differently.
 */
export function Timestamp({
  value,
  label,
  locale,
  timeZone,
}: {
  value: Date | string;
  label?: React.ReactNode;
  locale?: string;
  timeZone?: string;
}) {
  const when = value instanceof Date ? value : new Date(value);
  const valid = !Number.isNaN(when.getTime());
  return (
    <time dateTime={valid ? when.toISOString() : undefined}>
      {label ??
        (valid
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone,
            }).format(when)
          : String(value))}
    </time>
  );
}
