import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/data';
import { AppLanguage, I18nService } from '../services/i18n.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-setting',
  imports: [CommonModule, FormsModule],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting implements OnInit {
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);
  protected readonly languages = this.i18nService.availableLanguages;
  protected readonly currentLanguage = this.i18nService.language;

  adminInfo: any = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Profile form
  profileForm = {
    email: '',
    name: '',
  };

  // Password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  isUpdatingProfile = false;
  isChangingPassword = false;

  setLanguage(language: AppLanguage): void {
    this.i18nService.setLanguage(language);
  }

  ngOnInit(): void {
    this.loadAdminInfo();
  }

  loadAdminInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getAdminInfo()
      .pipe(finalize(() => this.finishRequest()))
      .subscribe({
        next: (response) => {
          this.adminInfo = response?.admin || null;
          if (this.adminInfo) {
            this.profileForm.email = this.adminInfo.email || '';
            this.profileForm.name = this.adminInfo.name || '';
          }
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = this.t('settings.serverError');
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || this.t('settings.updateFailed');
        }
      });
  }

  updateProfile(): void {
    if (this.isUpdatingProfile) return;

    this.isUpdatingProfile = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData: any = {};
    if (this.profileForm.email !== this.adminInfo?.email) {
      updateData.email = this.profileForm.email;
    }
    if (this.profileForm.name !== this.adminInfo?.name) {
      updateData.name = this.profileForm.name;
    }

    if (Object.keys(updateData).length === 0) {
      this.isUpdatingProfile = false;
      this.successMessage = this.t('settings.noChanges');
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.authService.updateAdmin(updateData)
      .pipe(finalize(() => {
        this.isUpdatingProfile = false;
        this.changeDetectorRef.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.successMessage = this.t('settings.profileUpdated');
          this.adminInfo = response?.admin || null;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = this.t('settings.serverError');
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || this.t('settings.updateFailed');
        }
      });
  }

  changePassword(): void {
    if (this.isChangingPassword) return;

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMessage = this.t('settings.passwordMismatch');
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.errorMessage = this.t('settings.passwordTooShort');
      return;
    }

    this.isChangingPassword = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.updateAdmin({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
    })
      .pipe(finalize(() => {
        this.isChangingPassword = false;
        this.changeDetectorRef.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.successMessage = this.t('settings.passwordChanged');
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = this.t('settings.serverError');
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || this.t('settings.passwordChangeFailed');
        }
      });
  }

  private finishRequest(): void {
    this.isLoading = false;
    this.changeDetectorRef.markForCheck();
  }
}
