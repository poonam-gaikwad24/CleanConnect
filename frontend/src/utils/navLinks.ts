import type { Role } from '../api/auth';

export interface NavItem {
  to: string;
  label: string;
}

// The main-navigation links for each kind of visitor. Only links the user can
// actually use are listed: every destination below is reachable for that role
// under the route guards in routes/AppRoutes.tsx (before this, staff and
// admins were shown citizen-only links that ended at "no permission").
// The routes themselves are unchanged — this only decides what is shown.
const TOILETS: NavItem = { to: '/toilets', label: 'Toilets' };

const BY_ROLE: Record<Role, NavItem[]> = {
  CITIZEN: [
    TOILETS,
    { to: '/complaints/create', label: 'Report an Issue' },
    { to: '/my-complaints', label: 'My Complaints' },
    { to: '/toilet-requests/create', label: 'Request a Toilet' },
    { to: '/my-toilet-requests', label: 'My Requests' },
  ],
  STAFF: [TOILETS, { to: '/staff/tasks', label: 'My Tasks' }],
  ADMIN: [
    TOILETS,
    { to: '/admin/complaints', label: 'Complaints' },
    { to: '/admin/toilet-requests', label: 'Toilet Requests' },
    { to: '/admin/toilets', label: 'Manage Toilets' },
    { to: '/admin/staff', label: 'Staff' },
  ],
};

export function navItemsFor(role: Role | null | undefined): NavItem[] {
  return role ? BY_ROLE[role] : [TOILETS];
}

export const ROLE_LABEL: Record<Role, string> = {
  CITIZEN: 'Citizen',
  STAFF: 'Staff',
  ADMIN: 'Admin',
};
