import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/data';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  limit = 15;
  total = 0;
  totalPages = 0;

  // Search
  allUsers: any[] = [];
  isSearching = false;
  private readonly SEARCH_RESULTS_LIMIT = 10;
  selectedUser: any = null;
  isLoadingDetails = false;
  isLoadingGameProfile = false;
  gameProfile: any = null;
  streakData: any = null;
  schoolName: string | null = null;
  detailError = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getUsers(this.currentPage, this.limit)
      .pipe(finalize(() => this.finishRequest()))
      .subscribe({
        next: (response) => {
          this.users = response?.users || [];
          this.filteredUsers = [...this.users];
          this.total = response?.total || 0;
          this.totalPages = response?.totalPages || 0;
          this.currentPage = response?.page || 1;
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = 'The server is not responding. Please try again later.';
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || 'Failed to load users';
        }
      });
  }

  loadAllUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load all users with a high limit to get all data
    this.authService.getUsers(1, 1000)
      .pipe(finalize(() => this.finishRequest()))
      .subscribe({
        next: (response) => {
          this.allUsers = response?.users || [];
          this.filterUsers();
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = 'The server is not responding. Please try again later.';
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || 'Failed to load users';
        }
      });
  }

  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.isSearching = false;
      this.filteredUsers = [...this.users];
      return;
    }

    this.isSearching = true;

    if (!this.allUsers.length) {
      this.loadAllUsers();
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const filtered = this.allUsers.filter(user =>
      user.userID?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.id?.toString().includes(term) ||
      user.grade?.name?.toLowerCase().includes(term) ||
      user.player?.name?.toLowerCase().includes(term) ||
      user.playerSkin?.name?.toLowerCase().includes(term)
    );

    this.filteredUsers = filtered.slice(0, this.SEARCH_RESULTS_LIMIT);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.isSearching = false;
    this.filteredUsers = [...this.users];
  }

  openUserDetails(user: any): void {
    if (!user?.id) return;
    this.selectedUser = null;
    this.gameProfile = null;
    this.streakData = null;
    this.schoolName = null;
    this.detailError = '';
    this.isLoadingDetails = true;
    this.isLoadingGameProfile = true;
    forkJoin({
      user: this.authService.getUserById(Number(user.id)),
      profile: this.authService.getUserGameProfile(Number(user.id)).pipe(catchError(() => of(null))),
      streak: this.authService.getAdminUserStreak(Number(user.id)).pipe(catchError(() => of(null))),
    })
      .pipe(switchMap((response) => {
        const details = response.user?.user || response.user;
        if (!details?.schoolCode) return of({ ...response, details, school: null });
        return this.authService.getSchoolByCode(details.schoolCode).pipe(
          catchError(() => of(null)),
          switchMap((schoolResponse) => of({ ...response, details, school: schoolResponse?.school || null })),
        );
      }))
      .pipe(finalize(() => {
        this.isLoadingDetails = false;
        this.isLoadingGameProfile = false;
        this.changeDetectorRef.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.selectedUser = response.details;
          this.gameProfile = response.profile?.profile || null;
          this.streakData = response.streak?.success ? response.streak : null;
          this.schoolName = response.school?.name || null;
        },
        error: (error) => { this.detailError = error?.error?.message || error?.message || 'Failed to load user details.'; },
      });
  }

  closeUserDetails(): void {
    this.selectedUser = null;
    this.detailError = '';
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadUsers();
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
    this.loadUsers();
  }

  private finishRequest(): void {
    this.isLoading = false;
    this.changeDetectorRef.markForCheck();
  }
}
