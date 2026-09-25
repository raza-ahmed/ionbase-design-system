/** The workspace's knowledge library, as folders. The same for every agent. */
export interface KnowledgeNode {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  children?: KnowledgeNode[];
  /** Why a source can't be chosen, when it can't. */
  locked?: string;
}

export const KNOWLEDGE: KnowledgeNode[] = [
  {
    id: 'policies',
    name: 'Policies',
    kind: 'folder',
    children: [
      { id: 'policies/refunds', name: 'Refunds.md', kind: 'file' },
      { id: 'policies/shipping', name: 'Shipping.md', kind: 'file' },
      {
        id: 'policies/escalation',
        name: 'Escalation',
        kind: 'folder',
        children: [
          { id: 'policies/escalation/tier-1', name: 'Tier 1.md', kind: 'file' },
          { id: 'policies/escalation/tier-2', name: 'Tier 2.md', kind: 'file' },
        ],
      },
    ],
  },
  {
    id: 'product',
    name: 'Product docs',
    kind: 'folder',
    children: [
      { id: 'product/api', name: 'API reference.md', kind: 'file' },
      { id: 'product/changelog', name: 'Changelog.md', kind: 'file' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    kind: 'folder',
    locked: 'Restricted to the Finance team',
  },
  { id: 'faq', name: 'FAQ.md', kind: 'file' },
];

/** What a new agent reads until someone changes it. */
export const DEFAULT_SOURCES = ['policies/refunds', 'policies/shipping', 'faq'];
