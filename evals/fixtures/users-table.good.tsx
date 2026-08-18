// The same task, built on the system.
import React from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Select,
  Button,
  Badge,
  Alert,
} from 'ionbase-ui';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export function UsersTable({
  users,
  isLoading,
  error,
  onRetry,
}: {
  users: User[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  if (error) {
    return (
      <Alert
        intent="error"
        title="Could not load users"
        actions={
          <Button variant="secondary" onPress={onRetry}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (isLoading) {
    return <p aria-live="polite">Loading users…</p>;
  }

  if (users.length === 0) {
    return (
      <Alert intent="information" title="No users yet">
        Invite a teammate to get started.
      </Alert>
    );
  }

  return (
    <div>
      <Select
        size="sm"
        label="Filter by role"
        options={[
          { value: 'all', label: 'All roles' },
          { value: 'admin', label: 'Admin' },
        ]}
      />
      <Button
        variant="secondary"
        isDisabled={selected.size === 0}
        onPress={() => setSelected(new Set())}
      >
        Deactivate selected
      </Button>

      <Table aria-label="Users" density="compact">
        <TableHead>
          <TableRow>
            <TableCell scope="col">
              <Checkbox aria-label="Select all users" />
            </TableCell>
            <TableCell scope="col">Name</TableCell>
            <TableCell scope="col">Email</TableCell>
            <TableCell scope="col">Role</TableCell>
            <TableCell scope="col">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} isSelected={selected.has(u.id)}>
              <TableCell>
                <Checkbox aria-label={`Select ${u.name}`} />
              </TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>
                <Badge intent={u.status === 'active' ? 'success' : 'neutral'}>
                  {u.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
