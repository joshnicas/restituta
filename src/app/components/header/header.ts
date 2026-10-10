import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/data';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private authService = inject(AuthService);
  private router = inject(Router);
  private i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  isLoggingOut = false;
  isMenuOpen = false;

  @Output() menuOpenChange = new EventEmitter<boolean>();

  toggleMenu(): void {
    this.setMenuOpen(!this.isMenuOpen);
  }

  closeMenu(): void {
    this.setMenuOpen(false);
  }

  private setMenuOpen(isOpen: boolean): void {
    this.isMenuOpen = isOpen;
    this.menuOpenChange.emit(isOpen);
  }

  logout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    this.authService.logout()
      .pipe(finalize(() => this.isLoggingOut = false))
      .subscribe({
        next: () => this.finishLogout(),
        error: () => this.finishLogout(),
      });
  }

  private finishLogout(): void {
    this.closeMenu();
    this.authService.clearSession();
    this.router.navigate(['/auth']);
  }
}
