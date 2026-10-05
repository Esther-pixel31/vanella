import { apiRequest } from './client';

// Staff (and admin) accounts and driver accounts live at separate paths.
const pathFor = (role) => (role === 'driver' ? 'drivers' : 'staff');

export function getTeamMembers(kind) {
  return apiRequest(`/api/admin/${kind}`);
}

export function getTeamMember(role, userId) {
  return apiRequest(`/api/admin/${pathFor(role)}/${userId}`);
}

// data: { full_name, phone_number, role, branch_id, username?, password? }
export function createTeamMember(data) {
  return apiRequest(`/api/admin/${pathFor(data.role)}`, {
    method: 'POST',
    body: data,
  });
}

// changes: any of full_name, phone_number, branch_id, is_active,
// username, password
export function updateTeamMember(role, userId, changes) {
  return apiRequest(`/api/admin/${pathFor(role)}/${userId}`, {
    method: 'PATCH',
    body: changes,
  });
}
