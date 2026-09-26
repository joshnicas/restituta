import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private loginUrl = 'http://localhost:8000/admin/login';
  private registerUrl = 'http://localhost:8000/admin/register';
  private logoutUrl = 'http://localhost:8000/admin/logout';

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
    return this.http.get<any>('http://localhost:8000/users', { headers, params }).pipe(timeout(15000));
  }

  getProfiles(page: number = 1, limit: number = 15): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    const params = { page: page.toString(), limit: limit.toString() };
    return this.http.get<any>('http://localhost:8000/profiles', { headers, params }).pipe(timeout(15000));
  }

  getUserById(userId: number): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>(`http://localhost:8000/users/${userId}`, { headers }).pipe(timeout(15000));
  }

  getLeaderboards(params: { period?: string; metric?: string; page?: number; limit?: number } = {}): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    let httpParams = new HttpParams();
    if (params.period) httpParams = httpParams.set('period', params.period);
    if (params.metric) httpParams = httpParams.set('metric', params.metric);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<any>('http://localhost:8000/leaderboards', { headers, params: httpParams }).pipe(timeout(15000));
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

    return this.http.get<any>('http://localhost:8000/leaderboards/grades', { headers, params: httpParams }).pipe(timeout(15000));
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

    return this.http.get<any>(`http://localhost:8000/leaderboards/grades/${gradeId}`, { headers, params: httpParams }).pipe(timeout(15000));
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

    return this.http.get<any>(`http://localhost:8000/leaderboards/grades/${gradeId}/subjects`, { headers, params: httpParams }).pipe(timeout(15000));
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

    return this.http.get<any>(`http://localhost:8000/leaderboards/grades/${gradeId}/${subjectId}`, { headers, params: httpParams }).pipe(timeout(15000));
  }

  getGrades(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>('http://localhost:8000/grades', { headers }).pipe(timeout(15000));
  }

  getSubjects(): Observable<any> {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>('http://localhost:8000/subjects', { headers }).pipe(timeout(15000));
  }
}
