import type { IsoDay } from '../lib/dates';
import { generateOverview, type OverviewData } from './overview';
import { read, type CallSettings } from './store';

export async function getOverview(
  range: { start: IsoDay; end: IsoDay },
  settings: CallSettings,
  signal: AbortSignal,
): Promise<OverviewData> {
  await read(
    settings,
    signal,
    'The metrics service did not respond (HTTP 503).',
  );
  return generateOverview(range.start, range.end, {
    empty: settings.state === 'empty',
    partial: settings.state === 'partial',
  });
}
