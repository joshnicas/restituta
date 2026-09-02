import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlayerProfile } from '../../shared/models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private readonly apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(
      `${this.apiUrl}/profiles/me`
    );
  }
}