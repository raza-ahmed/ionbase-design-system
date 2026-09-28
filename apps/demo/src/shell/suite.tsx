import { Icon, LogoMark, type AppSwitcherApp } from 'ionbase-ui';
import { Activity } from 'ionbase-icons/icons/activity';
import { BookOpen } from 'ionbase-icons/icons/book-open';
import { CreditCard } from 'ionbase-icons/icons/credit-card';
import { ShieldCheck } from 'ionbase-icons/icons/shield-check';

import { href } from '../lib/router';

/**
 * The IonBase suite, as the header's AppSwitcher lists it. Ops is this app
 * and opens at its home; the others are separate products at their own
 * addresses — `.example`, so a click in the demo goes nowhere real.
 */
export const SUITE: AppSwitcherApp[] = [
  {
    id: 'ops',
    name: 'Ops',
    href: href('overview'),
    description: 'Agents, runs and approvals',
    icon: <LogoMark size="sm" />,
  },
  {
    id: 'docs',
    name: 'Docs',
    href: 'https://docs.ionbase.example',
    description: 'Guides and the API',
    icon: <Icon as={BookOpen} size="lg" />,
  },
  {
    id: 'billing',
    name: 'Billing',
    href: 'https://billing.ionbase.example',
    description: 'Plan, usage and invoices',
    icon: <Icon as={CreditCard} size="lg" />,
  },
  {
    id: 'status',
    name: 'Status',
    href: 'https://status.ionbase.example',
    description: 'Uptime and incidents',
    icon: <Icon as={Activity} size="lg" />,
  },
  {
    id: 'trust',
    name: 'Trust',
    href: 'https://trust.ionbase.example',
    description: 'Security and compliance',
    icon: <Icon as={ShieldCheck} size="lg" />,
  },
];
