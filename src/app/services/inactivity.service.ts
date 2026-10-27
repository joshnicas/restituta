import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './data';
import { SessionRecoveryService } from './session-recovery.service';

@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private sessionRecovery = inject(SessionRecoveryService);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_DURATION = 10 * 60 * 1000; // 10 minutes

  // Pointer and wheel cover modern touchpads and touchscreen browsers too.
  private activityEvents = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart', 'click'];

  private boundResetTimer: () => void;

  constructor() {
    this.boundResetTimer = this.resetTimer.bind(this);
  }

  startMonitoring(): void {
    this.stopMonitoring();
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.boundResetTimer, true);
    });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.resetTimer();
  }

  stopMonitoring(): void {
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.boundResetTimer, true);
    });
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearTimer();
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.authService.isLoggedIn()) {
      this.resetTimer();
    }
  };

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
    if (!this.authService.isLoggedIn()) return;
    const returnUrl = this.router.url;
    this.sessionRecovery.capture(returnUrl);
    this.authService.clearSession();
    this.router.navigate(['/auth'], {
      queryParams: { sessionExpired: 'true', returnUrl }
    });
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
