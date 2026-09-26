import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/data';

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
      this.errorMessage = 'Session expired due to inactivity. Please log in again.';
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
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;

    if (this.mode === 'login') {
      const payload = { email: this.email, password: this.password };

      this.authService.login(payload)
        .pipe(finalize(() => this.finishRequest()))
        .subscribe({
          next: (response) => {
            this.successMessage = response?.message || 'Login successful!';
            this.saveToken(response);
            this.router.navigate(['/']);
          },
          error: (error) => {
            if (error?.status === 0 || error?.name === 'TimeoutError') {
              this.errorMessage = 'The server is not responding. Please try again later.';
              return;
            }

            this.errorMessage =
              error?.error?.message ||
              error?.error?.msg ||
              error?.message ||
              'Invalid email or password';
          }
        });
    } else {
      const payload = { name: this.name, email: this.email, password: this.password };

      this.authService.register(payload)
        .pipe(finalize(() => this.finishRequest()))
        .subscribe({
          next: (response) => {
            this.successMessage = response?.message || response?.msg || 'Registration successful! You can now log in.';
            this.mode = 'login';
            this.password = '';
            this.confirmPassword = '';
            this.name = '';
          },
          error: (error) => {
            console.error('Registration error:', error);

            if (error?.status === 0 || error?.name === 'TimeoutError') {
              this.errorMessage = 'The server is not responding. Please try again later.';
              return;
            }

            this.errorMessage = error?.error?.message || error?.error?.msg || error?.message || 'Registration failed. Try again.';
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
