import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { adminSessionInterceptor } from './interceptors/admin-session.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(), // 👈 Replaces zone change detection
    provideRouter(routes),
    provideHttpClient(withInterceptors([adminSessionInterceptor]))
  ]
};
