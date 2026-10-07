import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/data';
import { DashboardService } from '../services/dashboard.service';
import { finalize } from 'rxjs';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-rank',
  imports: [CommonModule, FormsModule],
  templateUrl: './rank.html',
  styleUrl: './rank.scss',
})
export class Rank implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  leaderboardEntries: any[] = [];
  expandedUserId: string | null = null;
  isLoading = false;
  errorMessage = '';

  // Filters
  selectedScope = 'global'; // global, grades, gradeSubjects, gradeSubject
  selectedPeriod = 'overall'; // overall, week, month
  selectedMetric = 'xp'; // xp, longestStreak
  selectedGrade: number | null = null;
  selectedSubject: number | null = null;
  selectedRegion = '';
  selectedDistrict = '';

  // Available options
  grades: any[] = [];
  subjects: any[] = [];
  regions: string[] = [];
  districts: string[] = [];
  isLoadingGrades = false;
  isLoadingSubjects = false;

  // Pagination
  currentPage = 1;
  limit = 15;
  total = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadGrades();
    this.loadSubjects();
    this.authService.getSchoolRegions().subscribe({ next: (response) => { this.regions = response?.regions || []; this.changeDetectorRef.markForCheck(); } });
    this.loadLeaderboard();
  }

  loadGrades(): void {
    this.isLoadingGrades = true;
    this.dashboardService.getGrades().subscribe({
      next: (response) => {
        console.log('Grades response:', response);
        this.grades = this.extractList(response, 'grades');
        console.log('Extracted grades:', this.grades);
        this.isLoadingGrades = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading grades:', error);
        this.isLoadingGrades = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  loadSubjects(): void {
    this.isLoadingSubjects = true;
    this.dashboardService.getSubjects().subscribe({
      next: (response) => {
        console.log('Subjects response:', response);
        this.subjects = this.extractList(response, 'subjects');
        console.log('Extracted subjects:', this.subjects);
        this.isLoadingSubjects = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading subjects:', error);
        this.isLoadingSubjects = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];

    const data = response['data'];
    if (Array.isArray(data)) return data as T[];
    return this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  loadLeaderboard(resetPage = true): void {
    this.isLoading = true;
    this.errorMessage = '';
    if (resetPage) this.currentPage = 1;

    const params = {
      period: this.selectedPeriod,
      metric: this.selectedMetric,
      page: this.currentPage,
      limit: this.limit,
      region: this.selectedRegion || undefined,
      district: this.selectedDistrict || undefined
    };

    let observable;

    if (this.selectedRegion || this.selectedDistrict) {
      observable = this.authService.getLeaderboards(params);
    } else switch (this.selectedScope) {
      case 'global':
        observable = this.authService.getLeaderboards(params);
        break;
      case 'grades':
        observable = this.authService.getGradeLeaderboards(params);
        break;
      case 'gradeSubjects':
        observable = this.selectedGrade
          ? this.authService.getGradeSubjectLeaderboards(this.selectedGrade, params)
          : this.authService.getLeaderboards(params);
        break;
      case 'gradeSubject':
        observable = (this.selectedGrade && this.selectedSubject)
          ? this.authService.getGradeSubjectLeaderboard(this.selectedGrade, this.selectedSubject, params)
          : this.authService.getLeaderboards(params);
        break;
      default:
        observable = this.authService.getLeaderboards(params);
    }

    observable.pipe(finalize(() => this.finishRequest())).subscribe({
      next: (response) => {
        console.log('Leaderboard response:', response);
        console.log('Selected scope:', this.selectedScope);

        // All endpoints return entries (plural)
        this.leaderboardEntries = response?.entries || [];
        if (this.expandedUserId && !this.leaderboardEntries.some((entry) => String(entry.userId) === this.expandedUserId)) {
          this.expandedUserId = null;
        }
        this.total = response?.total || 0;
        this.totalPages = response?.totalPages || 0;
        this.currentPage = response?.page || 1;

        console.log('Leaderboard entries:', this.leaderboardEntries);
        console.log('Total:', this.total);
      },
      error: (error) => {
        console.error('Error loading leaderboard:', error);
        if (error?.status === 0 || error?.name === 'TimeoutError') {
          this.errorMessage = 'The server is not responding. Please try again later.';
          return;
        }
        this.errorMessage = error?.error?.message || error?.message || 'Failed to load leaderboard';
      }
    });
  }

  toggleBreakdown(entry: any): void {
    const userId = String(entry.userId ?? entry.userID);
    this.expandedUserId = this.expandedUserId === userId ? null : userId;
  }

  get expandedEntry(): any | null {
    return this.leaderboardEntries.find((entry) => String(entry.userId ?? entry.userID) === this.expandedUserId) ?? null;
  }

  onScopeChange(): void {
    // Reset grade/subject selection when scope changes
    if (this.selectedScope === 'global' || this.selectedScope === 'grades') {
      this.selectedGrade = null;
      this.selectedSubject = null;
    } else if (this.selectedScope === 'gradeSubjects') {
      this.selectedSubject = null;
    }
    // Don't load leaderboard immediately if grade/subject needs to be selected
    if (this.selectedScope === 'gradeSubject' && (!this.selectedGrade || !this.selectedSubject)) {
      this.leaderboardEntries = [];
      this.total = 0;
      this.totalPages = 0;
      this.errorMessage = 'Please select a grade and subject to view the leaderboard';
      this.changeDetectorRef.markForCheck();
      return;
    }
    this.errorMessage = '';
    this.loadLeaderboard();
  }

  onFilterChange(): void {
    // Check if required selections are made
    if (this.selectedScope === 'gradeSubject' && (!this.selectedGrade || !this.selectedSubject)) {
      this.leaderboardEntries = [];
      this.total = 0;
      this.totalPages = 0;
      this.errorMessage = 'Please select a grade and subject to view the leaderboard';
      this.changeDetectorRef.markForCheck();
      return;
    }
    this.errorMessage = '';
    this.loadLeaderboard();
  }

  onRegionChange(): void {
    if (this.selectedRegion) {
      this.selectedScope = 'global';
      this.selectedGrade = null;
      this.selectedSubject = null;
    }
    this.selectedDistrict = '';
    this.districts = [];
    if (!this.selectedRegion) {
      this.onFilterChange();
      return;
    }
    this.authService.getSchoolDistricts(this.selectedRegion).subscribe({
      next: (response) => { this.districts = response?.districts || []; this.onFilterChange(); this.changeDetectorRef.markForCheck(); },
      error: () => this.onFilterChange()
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadLeaderboard(false);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  onLimitChange(): void {
    this.currentPage = 1;
    this.loadLeaderboard();
  }

  getScopeLabel(): string {
    const selectedGradeObj = this.grades.find(g => g.id === this.selectedGrade);
    const selectedSubjectObj = this.subjects.find(s => s.id === this.selectedSubject);

    switch (this.selectedScope) {
      case 'global': return this.t('leaderboard.globalLabel');
      case 'grades': return this.t('leaderboard.bestByGrade');
      case 'gradeSubjects': return selectedGradeObj ? `${selectedGradeObj.name} ${this.t('common.subjects')} ${this.t('leaderboard.title').toLowerCase()}` : this.t('leaderboard.gradeSubjectsLabel');
      case 'gradeSubject': return selectedGradeObj && selectedSubjectObj ? `${selectedGradeObj.name} - ${selectedSubjectObj.name} ${this.t('leaderboard.title')}` : this.t('leaderboard.gradeSubjectLabel');
      default: return this.t('leaderboard.title');
    }
  }

  private finishRequest(): void {
    this.isLoading = false;
    this.changeDetectorRef.markForCheck();
  }
}
