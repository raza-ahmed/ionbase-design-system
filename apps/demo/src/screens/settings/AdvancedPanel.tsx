import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Icon,
  Input,
  Link,
  Popover,
  Select,
} from 'ionbase-ui';
import { Info } from 'ionbase-icons/icons/info';

import { SettingRow } from '../../local/SettingRow';

/**
 * Less-used settings, collapsed. Data residency is the pattern's `empty` rule:
 * a setting this plan can't use is shown, disabled, with the reason — never
 * hidden, because an absent control reads as a missing feature.
 */
export function AdvancedPanel({
  plan,
}: {
  plan: 'Team' | 'Enterprise' | null;
}) {
  const enterprise = plan === 'Enterprise';
  return (
    <section className="demo-panel" aria-labelledby="advanced-title">
      <h2 id="advanced-title" className="ion-text-h6">
        Advanced
      </h2>
      <Accordion headingLevel={3} allowsMultiple>
        <AccordionItem id="api" title="API access">
          <div className="demo-form__fields">
            <Input
              size="sm"
              label="Workspace API key"
              value="iops_live_••••••••••••••••7f3a"
              isReadOnly
              description="Rotate it from the CLI. The full key was shown once, when it was created."
            />
            <Popover
              title="What this key can do"
              size="md"
              placement="bottom"
              content={
                <p className="ion-text-body-sm">
                  Start and stop runs, read run logs and approve or reject
                  paused runs. It can't create agents or change these settings.
                </p>
              }
            >
              <Button
                size="sm"
                variant="tertiary"
                startIcon={<Icon as={Info} size="sm" />}
              >
                What can this key do?
              </Button>
            </Popover>
          </div>
        </AccordionItem>
        <AccordionItem id="residency" title="Data residency">
          <SettingRow
            id="a-region"
            label={
              <span className="demo-cell-inline">
                Storage region
                {!enterprise && (
                  <Badge size="sm" intent="information">
                    Enterprise
                  </Badge>
                )}
              </span>
            }
            description={
              enterprise
                ? 'Where run logs and knowledge files are stored.'
                : 'Your Team plan stores data in the US. Choosing a region needs the Enterprise plan.'
            }
          >
            {({ labelId, descriptionId }) => (
              <Select
                size="sm"
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                isDisabled={!enterprise}
                options={[
                  { value: 'us', label: 'United States' },
                  { value: 'eu', label: 'European Union' },
                  { value: 'ap', label: 'Asia Pacific' },
                ]}
                defaultValue="us"
              />
            )}
          </SettingRow>
          {!enterprise && (
            <Link variant="standalone" href="https://example.com/pricing">
              Compare plans
            </Link>
          )}
        </AccordionItem>
      </Accordion>
    </section>
  );
}
