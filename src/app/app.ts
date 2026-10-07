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
    <app-header *ngIf="showHeader" />
    <main class="app-content">
      <router-outlet />
    </main>
  </div>
  `,
  styles: `
   .app-shell {
     display: flex;
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

   @media (max-width: 760px) {
     .app-shell {
       flex-direction: column;
     }
   }
  `,
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('admin-panel');

  private inactivityService = inject(InactivityService);
  private router = inject(Router);

  showHeader = true;

  ngOnInit(): void {
    this.inactivityService.startMonitoring();
    this.updateHeaderVisibility();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateHeaderVisibility());
  }

  ngOnDestroy(): void {
    this.inactivityService.stopMonitoring();
  }

  private updateHeaderVisibility(): void {
    this.showHeader = !this.router.url.startsWith('/auth');
  }
}
