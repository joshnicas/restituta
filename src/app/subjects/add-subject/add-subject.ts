import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

interface SelectableGrade {
  id: number;
  name: string;
  code?: string | null;
  stage?: string | null;
  active?: boolean | null;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-add-subject',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subject.html',
  styleUrls: ['./add-subject.scss'],
})
export class AddSubject implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  name = '';
  code = '';
  icon = '';
  submitting = false;
  error: string | null = null;

  /** Grades come from the catalog; every choice creates a GradeSubject row. */
  grades: SelectableGrade[] = [];
  selectedGradeIds = new Set<number>();
  loadingGrades = true;

  /** Optional ?gradeId= scope: preselect it and return there after saving. */
  returnScope = 0;

  ngOnInit(): void {
    const requested = Number(this.route.snapshot.queryParamMap.get('gradeId'));
    this.returnScope = Number.isSafeInteger(requested) && requested > 0 ? requested : 0;
    this.loadGrades();
  }

  private loadGrades(): void {
    this.loadingGrades = true;
    this.dashboardService.getGrades().subscribe({
      next: (response) => {
        this.grades = this.extractGrades(response);
        if (this.returnScope > 0) {
          this.selectedGradeIds.add(this.returnScope);
        }
        this.loadingGrades = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingGrades = false;
        this.error = 'Could not load grades. Please try again.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  isSelected(grade: SelectableGrade): boolean {
    return this.selectedGradeIds.has(grade.id);
  }

  toggleGrade(grade: SelectableGrade, checked: boolean): void {
    if (checked) {
      this.selectedGradeIds.add(grade.id);
    } else {
      this.selectedGradeIds.delete(grade.id);
    }
  }

  get canSubmit(): boolean {
    return !!this.name.trim()
      && !!this.code.trim()
      && !this.submitting
      && !this.loadingGrades
      && this.selectedGradeIds.size > 0;
  }

  save(): void {
    const name = this.name.trim();
    const code = this.code.trim();
    if (!name || !code || this.submitting) return;

    if (this.selectedGradeIds.size === 0) {
      this.error = 'Choose at least one grade: subjects are taught within a grade.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    const icon = this.icon.trim();
    this.submitting = true;
    this.error = null;

    this.dashboardService.createSubject({
      name,
      code,
      active: true,
      gradeIds: [...this.selectedGradeIds].sort((a, b) => a - b),
      ...(icon ? { icon } : {}),
    }).subscribe({
      next: () => this.afterSaved(),
      error: (error) => {
        this.submitting = false;
        this.error = this.getErrorMessage(error);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private afterSaved(): void {
    this.router.navigate(
      ['/subjects'],
      this.returnScope > 0 ? { queryParams: { gradeId: this.returnScope } } : {},
    );
  }

  cancel(): void {
    this.router.navigate(
      ['/subjects'],
      this.returnScope > 0 ? { queryParams: { gradeId: this.returnScope } } : {},
    );
  }

  private extractGrades(response: unknown): SelectableGrade[] {
    let records: ApiRecord[] = [];
    if (Array.isArray(response)) {
      records = response as ApiRecord[];
    } else if (this.isRecord(response) && Array.isArray(response['grades'])) {
      records = response['grades'] as ApiRecord[];
    } else if (this.isRecord(response) && this.isRecord(response['data'])) {
      const data = response['data'];
      if (Array.isArray(data['grades'])) records = data['grades'] as ApiRecord[];
      else if (Array.isArray(data)) records = data as ApiRecord[];
    }
    return records.map((record) => ({
      id: typeof record['id'] === 'number'
        ? record['id']
        : Number.isFinite(Number(record['id']))
          ? Number(record['id'])
          : 0,
      name: typeof record['name'] === 'string' && record['name'] !== ''
        ? record['name'] as string
        : 'Grade',
      code: typeof record['code'] === 'string' ? record['code'] as string : null,
      stage: typeof record['stage'] === 'string' ? record['stage'] as string : null,
      active: typeof record['active'] === 'boolean' ? record['active'] as boolean : null,
    })).filter((grade) => grade.id > 0);
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }

  private getErrorMessage(error: unknown): string {
    const apiError = error as { error?: { message?: unknown } };
    const message = apiError?.error?.message;
    return typeof message === 'string' ? message : 'Could not create the subject. Please try again.';
  }
}
