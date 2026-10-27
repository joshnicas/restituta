import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/data';
import { SessionRecoveryService } from '../services/session-recovery.service';

export const adminSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const recovery = inject(SessionRecoveryService);

  return next(request).pipe(catchError((error: unknown) => {
    const isAdminLogin = request.url.endsWith('/admin/login');
    if (error instanceof HttpErrorResponse && error.status === 401 && !isAdminLogin && auth.isLoggedIn()) {
      const returnUrl = router.url;
      recovery.capture(returnUrl);
      auth.clearSession();
      void router.navigate(['/auth'], {
        queryParams: { sessionExpired: 'true', returnUrl },
      });
    }
    return throwError(() => error);
  }));
};
