import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatCard } from './stat-card/stat-card';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-home',
  imports: [StatCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private dashboardService = inject(DashboardService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  stats = {
    users: 0,
    subjects: 0,
    questions: 0,
    images: 0,
    audios: 0
  };

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.dashboardService.getUsers().subscribe({
      next: (response) => this.updateCount('users', response),
      error: (error) => console.error('Error fetching users:', error)
    });

    this.dashboardService.getSubjects().subscribe({
      next: (response) => this.updateCount('subjects', response),
      error: (error) => console.error('Error fetching subjects:', error)
    });

    this.dashboardService.getQuestions().subscribe({
      next: (response) => this.updateCount('questions', response),
      error: (error) => console.error('Error fetching questions:', error)
    });

    this.dashboardService.getImages().subscribe({
      next: (response) => this.updateCount('images', response),
      error: (error) => console.error('Error fetching images:', error)
    });

    this.dashboardService.getAudios().subscribe({
      next: (response) => this.updateCount('audios', response),
      error: (error) => console.error('Error fetching audios:', error)
    });
  }

  private updateCount(stat: 'users' | 'subjects' | 'questions' | 'images' | 'audios', response: unknown): void {
    // Handle paginated response for users (includes total field)
    if (stat === 'users' && this.isRecord(response) && 'total' in response) {
      this.stats.users = (response as { total: number }).total;
      this.changeDetectorRef.markForCheck();
      return;
    }

    const data = (response as { data?: unknown })?.data ?? response;
    const list = Array.isArray(data)
      ? data
      : (data as Record<string, unknown>)?.[stat];

    this.stats[stat] = Array.isArray(list) ? list.length : 0;
    // HTTP callbacks do not automatically refresh templates in this zoneless app.
    this.changeDetectorRef.markForCheck();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
