import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CodeSnippet,
  Icon,
  Input,
  Link,
  Popover,
  Select,
  SettingRow,
} from 'ionbase-ui';
import { Info } from 'ionbase-icons/icons/info';

const START_COMMAND =
  'iops runs start --agent invoice-reconciler --input ./march-invoices.csv --wait';

const API_REQUEST = `curl -X POST https://api.ionbase.dev/v1/runs \\
  -H "Authorization: Bearer $IOPS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "invoice-reconciler",
    "input": "march-invoices.csv",
    "notify": ["finance-ops"]
  }'`;

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
    <Card title="Advanced">
      <Accordion headingLevel={3} allowsMultiple>
        <AccordionItem id="api" title="API access">
          <div className="demo-form__fields">
            <Input
              size="sm"
              label="Workspace API key"
              value="iops_live_••••••••••••••••7f3a"
              isReadOnly
              description={
                <>
                  Rotate it with{' '}
                  <CodeSnippet type="inline">iops keys rotate</CodeSnippet>. The
                  full key was shown once, when it was created.
                </>
              }
            />
            <div className="demo-snippet">
              <p className="ion-text-body-sm">Start a run from the CLI</p>
              <CodeSnippet
                label="Start run command"
                copyLabel="Copy start run command"
              >
                {START_COMMAND}
              </CodeSnippet>
            </div>
            <div className="demo-snippet">
              <p className="ion-text-body-sm">Or call the API</p>
              <CodeSnippet
                type="multi"
                label="API request"
                copyLabel="Copy API request"
                language="bash"
              >
                {API_REQUEST}
              </CodeSnippet>
            </div>
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
            <Select
              size="sm"
              isDisabled={!enterprise}
              options={[
                { value: 'us', label: 'United States' },
                { value: 'eu', label: 'European Union' },
                { value: 'ap', label: 'Asia Pacific' },
              ]}
              defaultValue="us"
            />
          </SettingRow>
          {!enterprise && (
            <Link variant="standalone" href="https://example.com/pricing">
              Compare plans
            </Link>
          )}
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
