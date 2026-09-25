import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  TreeView,
  useToast,
  type TreeViewItem,
} from 'ionbase-ui';
import { FileText } from 'ionbase-icons/icons/file-text';
import { Folder } from 'ionbase-icons/icons/folder';

import {
  DEFAULT_SOURCES,
  KNOWLEDGE,
  type KnowledgeNode,
} from '../../data/knowledge';

const toItems = (nodes: KnowledgeNode[]): TreeViewItem[] =>
  nodes.map((n) => ({
    id: n.id,
    label: n.name,
    icon: <Icon as={n.kind === 'folder' ? Folder : FileText} size="sm" />,
    description: n.locked,
    isDisabled: !!n.locked,
    children: n.children && toItems(n.children),
  }));

const same = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((k) => b.has(k));

/**
 * Which knowledge an agent may read — a TreeView with multiple selection,
 * saved together like the Settings defaults. Selecting a folder selects the
 * folder only, the component's rule; the agent reads what is ticked.
 */
export function KnowledgeSources({ agentName }: { agentName: string }) {
  const toast = useToast();
  const items = useMemo(() => toItems(KNOWLEDGE), []);
  const [saved, setSaved] = useState(() => new Set(DEFAULT_SOURCES));
  const [draft, setDraft] = useState(saved);
  const dirty = !same(saved, draft);

  return (
    <Card
      title="Knowledge sources"
      description={`Ticked sources are what ${agentName} reads when it answers.`}
      action={
        dirty && (
          <Button
            size="sm"
            onClick={() => {
              setSaved(draft);
              toast.toast({
                intent: 'success',
                title: `${draft.size} knowledge sources saved`,
              });
            }}
          >
            Save sources
          </Button>
        )
      }
    >
      <TreeView
        aria-label="Knowledge sources"
        className="demo-knowledge-tree"
        items={items}
        selectionMode="multiple"
        selectedKeys={draft}
        onSelectionChange={setDraft}
        defaultExpandedKeys={['policies']}
      />
    </Card>
  );
}
