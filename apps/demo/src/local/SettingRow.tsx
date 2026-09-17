import type { ReactNode } from 'react';

/**
 * LOCAL STAND-IN — gap list: the SettingsPanel pattern describes this row
 * (label and description left, control right) but IonBase has no component
 * for it. The ids are handed to the control so the description is announced
 * with the setting, not left floating beside it.
 */
export function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  children: (ids: { labelId: string; descriptionId?: string }) => ReactNode;
}) {
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className="demo-setting">
      <div className="demo-setting__text">
        <span id={labelId} className="ion-text-body ion-text--semibold">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="ion-text-body-sm demo-muted">
            {description}
          </span>
        )}
      </div>
      <div className="demo-setting__control">
        {children({ labelId, descriptionId })}
      </div>
    </div>
  );
}
