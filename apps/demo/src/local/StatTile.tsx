import { Badge, Icon, type IconComponent } from 'ionbase-ui';
import { TrendingDown } from 'ionbase-icons/icons/trending-down';
import { TrendingUp } from 'ionbase-icons/icons/trending-up';

/**
 * LOCAL STAND-IN — gap list: IonBase has no KPI/stat tile. FullCard is a
 * full-bleed text-and-media row, not a metric. If this shape survives phases
 * 2–3 unchanged it is a candidate component.
 */
export interface StatTileProps {
  label: string;
  value: string;
  /** Change against the previous period. Omit when unknown. */
  change?: number;
  /**
   * `%` for a relative change, `pts` for a metric that is already a percentage —
   * 95% → 96% is +1 pt, and calling it +1.1% misreports it.
   */
  unit?: '%' | 'pts';
  /** Which direction is good news. `neutral` never colours the change. */
  goodWhen?: 'up' | 'down' | 'neutral';
}

export function StatTile({
  label,
  value,
  change,
  unit = '%',
  goodWhen = 'up',
}: StatTileProps) {
  // Rounded first, so a -0.04 change reads "No change" rather than "-0.0%".
  const rounded = change === undefined ? undefined : Number(change.toFixed(1));
  let trend: {
    icon?: IconComponent;
    intent: 'success' | 'error' | 'neutral';
    text: string;
  } = { intent: 'neutral', text: 'No change' };
  if (rounded) {
    const up = rounded > 0;
    const good = goodWhen === 'neutral' ? null : up === (goodWhen === 'up');
    trend = {
      icon: up ? TrendingUp : TrendingDown,
      intent: good === null ? 'neutral' : good ? 'success' : 'error',
      text: `${up ? '+' : ''}${rounded.toFixed(1)}${unit === '%' ? '%' : ' pts'}`,
    };
  }

  return (
    <div className="demo-stat">
      <dt className="ion-text-body-sm demo-stat__label">{label}</dt>
      <dd className="demo-stat__body">
        <span className="ion-text-h4">{value}</span>
        {rounded !== undefined && (
          <span className="demo-stat__change">
            <Badge
              size="sm"
              intent={trend.intent}
              icon={trend.icon && <Icon as={trend.icon} size="xs" />}
            >
              {trend.text}
            </Badge>
            <span className="ion-text-caption demo-muted">vs previous</span>
          </span>
        )}
      </dd>
    </div>
  );
}
