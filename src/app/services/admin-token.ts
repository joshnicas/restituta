import { HttpHeaders } from '@angular/common/http';

/** Reads the admin session consistently across all API services. */
export function getAdminToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  // Prefer the admin-specific key, but fall back for existing sessions.
  return localStorage.getItem('admin_token') || localStorage.getItem('token');
}

export function getAdminHeaders(): HttpHeaders | undefined {
  const token = getAdminToken();
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
}

export function clearAdminToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('token');
}
