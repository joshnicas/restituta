import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/data';
import { I18nService } from '../services/i18n.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.scss']
})
export class AuthComponent implements OnInit {
  // Inject the service that communicates with http://localhost:8000/admin/login
  private authService = inject(AuthService);
  private router = inject(Router);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  mode: AuthMode = 'login';

  // login fields
  email = '';
  password = '';

  // extra register fields
  name = '';
  confirmPassword = '';

  // Simple feedback message properties for your HTML template
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  ngOnInit(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sessionExpired') === 'true') {
      this.errorMessage = this.t('auth.sessionExpired');
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  setMode(mode: AuthMode): void {
    this.mode = mode;
    this.clearMessages();
  }

  private saveToken(response: any): void {
    const token = response?.token || response?.accessToken || response?.data?.token;

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('admin_token', token);
    }
  }

  onSubmit(): void {
    this.clearMessages();

    if (this.mode === 'register' && this.password !== this.confirmPassword) {
      this.errorMessage = this.t('auth.passwordMismatch');
      return;
    }

    this.isLoading = true;

    if (this.mode === 'login') {
      const payload = { email: this.email, password: this.password };

      this.authService.login(payload)
        .pipe(finalize(() => this.finishRequest()))
        .subscribe({
          next: (response) => {
            this.successMessage = response?.message || this.t('auth.loginSuccessful');
            this.saveToken(response);
            this.router.navigate(['/']);
          },
          error: (error) => {
            if (error?.status === 0 || error?.name === 'TimeoutError') {
              this.errorMessage = this.t('auth.serverUnavailable');
              return;
            }

            this.errorMessage =
              error?.error?.message ||
              error?.error?.msg ||
              error?.message ||
              this.t('auth.invalidCredentials');
          }
        });
    } else {
      const payload = { name: this.name, email: this.email, password: this.password };

      this.authService.register(payload)
        .pipe(finalize(() => this.finishRequest()))
        .subscribe({
          next: (response) => {
            this.successMessage = response?.message || response?.msg || this.t('auth.registrationSuccess');
            this.mode = 'login';
            this.password = '';
            this.confirmPassword = '';
            this.name = '';
          },
          error: (error) => {
            console.error('Registration error:', error);

            if (error?.status === 0 || error?.name === 'TimeoutError') {
              this.errorMessage = this.t('auth.serverUnavailable');
              return;
            }

            this.errorMessage = error?.error?.message || error?.error?.msg || error?.message || this.t('auth.registrationFailed');
          }
        });
    }
  }

  private finishRequest(): void {
    this.isLoading = false;
    // Http callbacks do not automatically trigger rendering in this zoneless app.
    this.changeDetectorRef.markForCheck();
  }
}
