import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/data';
import { finalize, map, forkJoin } from 'rxjs';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-user-game-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-game-profile.html',
  styleUrl: './user-game-profile.scss',
})
export class UserGameProfile implements OnInit {
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  profiles: any[] = [];
  filteredProfiles: any[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  limit = 15;
  total = 0;
  totalPages = 0;

  // Search
  allProfiles: any[] = [];
  isSearching = false;
  private readonly SEARCH_RESULTS_LIMIT = 10;

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getProfiles(this.currentPage, this.limit)
      .pipe(finalize(() => this.finishRequest()))
      .subscribe({
        next: (response) => {
          const profiles = response?.profiles || [];
          this.loadUserDetailsForProfiles(profiles);
          this.total = response?.total || 0;
          this.totalPages = response?.totalPages || 0;
          this.currentPage = response?.page || 1;
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = 'The server is not responding. Please try again later.';
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || 'Failed to load profiles';
        }
      });
  }

  loadUserDetailsForProfiles(profiles: any[]): void {
    if (profiles.length === 0) {
      this.profiles = [];
      this.filteredProfiles = [];
      return;
    }

    // Fetch user details for each profile
    const userRequests = profiles.map(profile =>
      this.authService.getUserById(profile.userId).pipe(
        map((userResponse) => ({
          ...profile,
          userID: userResponse?.user?.userID || userResponse?.userID || profile.userId
        }))
      )
    );

    forkJoin(userRequests).subscribe({
      next: (enrichedProfiles) => {
        this.profiles = enrichedProfiles;
        this.filteredProfiles = [...this.profiles];
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        // If fetching user details fails, use the original profiles
        this.profiles = profiles;
        this.filteredProfiles = [...this.profiles];
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  loadAllProfiles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load all profiles with a high limit to get all data
    this.authService.getProfiles(1, 1000)
      .pipe(finalize(() => this.finishRequest()))
      .subscribe({
        next: (response) => {
          const profiles = response?.profiles || [];
          this.loadUserDetailsForAllProfiles(profiles);
        },
        error: (error) => {
          if (error?.status === 0 || error?.name === 'TimeoutError') {
            this.errorMessage = 'The server is not responding. Please try again later.';
            return;
          }
          this.errorMessage = error?.error?.message || error?.message || 'Failed to load profiles';
        }
      });
  }

  loadUserDetailsForAllProfiles(profiles: any[]): void {
    if (profiles.length === 0) {
      this.allProfiles = [];
      this.filterProfiles();
      return;
    }

    // Fetch user details for each profile
    const userRequests = profiles.map(profile =>
      this.authService.getUserById(profile.userId).pipe(
        map((userResponse) => ({
          ...profile,
          userID: userResponse?.user?.userID || userResponse?.userID || profile.userId
        }))
      )
    );

    forkJoin(userRequests).subscribe({
      next: (enrichedProfiles) => {
        this.allProfiles = enrichedProfiles;
        this.filterProfiles();
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        // If fetching user details fails, use the original profiles
        this.allProfiles = profiles;
        this.filterProfiles();
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  filterProfiles(): void {
    if (!this.searchTerm.trim()) {
      this.isSearching = false;
      this.filteredProfiles = [...this.profiles];
      return;
    }

    this.isSearching = true;

    if (!this.allProfiles.length) {
      this.loadAllProfiles();
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const filtered = this.allProfiles.filter(profile =>
      profile.userID?.toLowerCase().includes(term) ||
      profile.userId?.toString().includes(term) ||
      profile.key?.toLowerCase().includes(term)
    );

    this.filteredProfiles = filtered.slice(0, this.SEARCH_RESULTS_LIMIT);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.isSearching = false;
    this.filteredProfiles = [...this.profiles];
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadProfiles();
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
    this.loadProfiles();
  }

  private finishRequest(): void {
    this.isLoading = false;
    this.changeDetectorRef.markForCheck();
  }
}