// A plausible-looking implementation that ignores the design system.
// Every defect here is one an unhelped model actually produces.
import React from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export function UsersTable({ users }: { users: User[] }) {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select>
          <option>All roles</option>
          <option>Admin</option>
        </select>
        <button style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>
          Deactivate selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" />
            </th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <input type="checkbox" />
              </td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <StatusPill status={u.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span style={{ color: status === 'active' ? '#0d7d38' : '#6b7280' }}>
      {status}
    </span>
  );
}
