import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../services/data';

@Component({
  selector: 'app-payments',
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  payments: any[] = [];
  filtered: any[] = [];
  status = 'ALL';
  search = '';
  loading = false;
  error = '';
  page = 1;
  totalPages = 1;
  total = 0;
  limit = 25;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.auth.getPayments(this.page, this.limit, { status: this.status, search: this.search }).pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: (response) => {
        this.payments = response?.payments ?? [];
        this.total = response?.total ?? 0;
        this.page = response?.page ?? this.page;
        this.limit = response?.limit ?? this.limit;
        this.totalPages = Math.max(1, response?.totalPages ?? 1);
        this.filtered = this.payments;
      },
      error: (error) => { this.error = error?.error?.message ?? 'Failed to load payment history.'; },
    });
  }

  filter(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.page = 1;
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  applyFilters(): void { if (this.searchTimer) clearTimeout(this.searchTimer); this.page = 1; this.load(); }

  changePage(page: number): void { if (page >= 1 && page <= this.totalPages && page !== this.page) { this.page = page; this.load(); } }

  changeLimit(): void { this.page = 1; this.load(); }

  ngOnDestroy(): void { if (this.searchTimer) clearTimeout(this.searchTimer); }
}
