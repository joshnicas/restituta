import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './data';

@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_DURATION = 10 * 60 * 1000; // 10 minutes

  private activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  private boundResetTimer: () => void;

  constructor() {
    this.boundResetTimer = this.resetTimer.bind(this);
  }

  startMonitoring(): void {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.boundResetTimer, true);
    });
    this.resetTimer();
  }

  stopMonitoring(): void {
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.boundResetTimer, true);
    });
    this.clearTimer();
  }

  private resetTimer(): void {
    this.clearTimer();
    this.timeoutId = setTimeout(() => {
      this.handleInactivityLogout();
    }, this.INACTIVITY_DURATION);
  }

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handleInactivityLogout(): void {
    this.authService.clearSession();
    this.router.navigate(['/auth'], {
      queryParams: { sessionExpired: 'true' }
    });
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
