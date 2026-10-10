import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { InactivityService } from './services/inactivity.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Header],
  template: `
  <div class="app-shell">
    <app-header *ngIf="showHeader" (menuOpenChange)="setMenuOpen($event)" />
    <button
      *ngIf="showHeader && isMenuOpen"
      class="navigation-backdrop"
      type="button"
      aria-label="Close navigation menu"
      (click)="closeNavigation()">
    </button>
    <main class="app-content">
      <router-outlet />
    </main>
  </div>
  `,
  styles: `
     .app-shell {
     display: flex;
       width: 100%;
     min-height: 100vh;
     background:
       radial-gradient(circle at top left, rgba(109, 91, 208, 0.2), transparent 24%),
       linear-gradient(180deg, #0d0026 0%, #12032f 100%);
   }

     .app-content {
     flex: 1;
     min-width: 0;
     padding-bottom: 2rem;
   }

   .navigation-backdrop {
     display: none;
   }

   @media (max-width: 1100px) {
     .navigation-backdrop {
       display: block;
       position: fixed;
       inset: 0;
       z-index: 11;
       border: 0;
       background: rgba(5, 2, 20, 0.48);
       cursor: default;
     }

   }

   .app-shell:has(app-auth) .app-content {
     width: 100%;
     margin-left: 0;
   }
  `,
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('admin-panel');

  private inactivityService = inject(InactivityService);
  private router = inject(Router);

  showHeader = true;
  isMenuOpen = false;

  ngOnInit(): void {
    this.inactivityService.startMonitoring();
    this.updateHeaderVisibility();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateHeaderVisibility());
  }

  ngOnDestroy(): void {
    this.inactivityService.stopMonitoring();
    this.setMenuOpen(false);
  }

  setMenuOpen(isOpen: boolean): void {
    this.isMenuOpen = isOpen;
    document.body.classList.toggle('navigation-open', isOpen);
  }

  closeNavigation(): void {
    this.setMenuOpen(false);
  }

  private updateHeaderVisibility(): void {
    this.showHeader = !this.router.url.startsWith('/auth');
    if (!this.showHeader) this.setMenuOpen(false);
  }
}
