import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private loginUrl = `${this.apiBaseUrl}/admin/login`;
  private registerUrl = `${this.apiBaseUrl}/admin/register`;
  private logoutUrl = `${this.apiBaseUrl}/admin/logout`;

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.loginUrl, credentials).pipe(timeout(15000));
  }

  register(userData: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.registerUrl, userData).pipe(timeout(15000));
  }

  isLoggedIn(): boolean {
    return !!(localStorage.getItem('token') || localStorage.getItem('admin_token'));
  }

  logout(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.post<any>(this.logoutUrl, {}, { headers }).pipe(timeout(15000));
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
  }

  getUsers(page: number = 1, limit: number = 15): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    const params = { page: page.toString(), limit: limit.toString() };
    return this.http.get<any>(`${this.apiBaseUrl}/admin/users`, { headers, params }).pipe(timeout(15000));
  }

  getPayments(page: number = 1, limit: number = 100): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const params = { page: page.toString(), limit: limit.toString() };
    return this.http.get<any>(`${this.apiBaseUrl}/admin/payments`, { headers, params }).pipe(timeout(15000));
  }

  getProfiles(page: number = 1, limit: number = 15): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    const params = { page: page.toString(), limit: limit.toString() };
    return this.http.get<any>(`${this.apiBaseUrl}/profiles`, { headers, params }).pipe(timeout(15000));
  }

  getUserById(userId: number): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>(`${this.apiBaseUrl}/users/${userId}`, { headers }).pipe(timeout(15000));
  }

  getLeaderboards(params: { period?: string; metric?: string; page?: number; limit?: number; region?: string; district?: string } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.region) httpParams = httpParams.set('region', params.region);
    if (params.district) httpParams = httpParams.set('district', params.district);

    return this.http.get<any>(`${this.apiBaseUrl}/leaderboards`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getSchoolRegions(): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}/schools/regions`).pipe(timeout(15000));
  }

  getSchoolDistricts(region: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}/schools/districts`, { params: { region } }).pipe(timeout(15000));
  }

  getGradeLeaderboards(params: { period?: string; metric?: string; page?: number; limit?: number } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiBaseUrl}/leaderboards/grades`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getGradeLeaderboard(gradeId: number, params: { period?: string; metric?: string; page?: number; limit?: number } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiBaseUrl}/leaderboards/grades/${gradeId}`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getGradeSubjectLeaderboards(gradeId: number, params: { period?: string; metric?: string; page?: number; limit?: number } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiBaseUrl}/leaderboards/grades/${gradeId}/subjects`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getGradeSubjectLeaderboard(gradeId: number, subjectId: number, params: { period?: string; metric?: string; page?: number; limit?: number } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>(`${this.apiBaseUrl}/leaderboards/grades/${gradeId}/${subjectId}`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getGrades(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>(`${this.apiBaseUrl}/grades`, { headers }).pipe(timeout(15000));
  }

  getSubjects(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>(`${this.apiBaseUrl}/subjects`, { headers }).pipe(timeout(15000));
  }

  getAdminInfo(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>(`${this.apiBaseUrl}/admin/me`, { headers }).pipe(timeout(15000));
  }

  updateAdmin(data: { email?: string; name?: string; currentPassword?: string; newPassword?: string }): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.put<any>(`${this.apiBaseUrl}/admin/me`, data, { headers }).pipe(timeout(15000));
  }
}
