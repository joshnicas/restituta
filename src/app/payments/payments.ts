import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
export class Payments implements OnInit {
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

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.auth.getPayments(this.page).pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: (response) => { this.payments = response?.payments ?? []; this.totalPages = response?.totalPages ?? 1; this.filter(); },
      error: (error) => { this.error = error?.error?.message ?? 'Failed to load payment history.'; },
    });
  }

  filter(): void {
    const query = this.search.trim().toLowerCase();
    this.filtered = this.payments.filter((payment) =>
      (this.status === 'ALL' || payment.status === this.status) &&
      (!query || [payment.externalRef, payment.providerReference, payment.user?.userID, payment.user?.email, payment.plan?.name]
        .some((value) => String(value ?? '').toLowerCase().includes(query))),
    );
  }

  changePage(page: number): void { if (page >= 1 && page <= this.totalPages && page !== this.page) { this.page = page; this.load(); } }
}
