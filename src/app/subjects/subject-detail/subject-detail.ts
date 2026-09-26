import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';

type ApiRecord = Record<string, unknown>;

interface Grade {
  id: number;
  name: string;
  code?: string;
  stage?: string;
  active?: boolean;
}

interface ManagedSubject {
  id: number;
  gradeSubjectId: number;
  name: string;
  code?: string;
  icon?: string | null;
  description?: string | null;
  active?: boolean;
}

interface NewSubjectForm {
  name: string;
  code: string;
  icon: string;
  description: string;
  active: boolean;
}

@Component({
  selector: 'app-subject-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './subject-detail.html',
  styleUrls: ['./subject-detail.scss']
})
export class SubjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  gradeId = 0;
  grade: Grade | null = null;
  subjects: ManagedSubject[] = [];
  loading = true;
  saving = false;
  deletingSubjectId: number | null = null;
  error: string | null = null;
  actionError: string | null = null;
  addingSubject = false;
  newSubject: NewSubjectForm = this.emptySubjectForm();

  get pageTitle(): string {
    return this.grade?.name ? `${this.grade.name} Subjects` : 'Grade Subjects';
  }

  get pageIntro(): string {
    return this.grade?.name
      ? `Add, edit, and delete subjects taught in ${this.grade.name}.`
      : 'Add, edit, and delete subjects for the selected grade.';
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const gradeId = Number(params.get('id'));
      this.gradeId = Number.isSafeInteger(gradeId) && gradeId > 0 ? gradeId : 0;

      if (this.gradeId === 0) {
        this.error = 'Choose a grade before managing subjects.';
        this.loading = false;
        return;
      }

      this.loadGradeSubjects();
    });
  }

  loadGradeSubjects(): void {
    this.loading = true;
    this.error = null;
    this.actionError = null;

    forkJoin({
      grade: this.dashboardService.getGrade(this.gradeId),
      gradeSubjects: this.dashboardService.getSubjectsByGrade(this.gradeId),
      subjects: this.dashboardService.getSubjects(),
    }).subscribe({
      next: ({ grade, gradeSubjects, subjects }) => {
        this.grade = this.extractGrade(grade);
        this.subjects = this.extractGradeSubjectEntries(gradeSubjects, grade, subjects)
          .map((entry) => this.mapGradeSubject(entry))
          .filter((subject): subject is ManagedSubject => subject !== null)
          .filter((subject, index, list) => list.findIndex((item) => item.id === subject.id) === index);
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load subjects: ${this.getErrorMessage(err)}`;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  showAddSubject(): void {
    if (this.saving) return;
    this.addingSubject = true;
    this.actionError = null;
  }

  hideAddSubject(): void {
    this.addingSubject = false;
    this.newSubject = this.emptySubjectForm();
  }

  createSubject(): void {
    const name = this.newSubject.name.trim();
    const code = this.newSubject.code.trim();

    if (!name || !code || this.saving) return;

    this.saving = true;
    this.actionError = null;
    this.dashboardService.createSubject({
      name,
      code,
      active: this.newSubject.active,
      gradeIds: [this.gradeId],
      ...this.optionalText('icon', this.newSubject.icon),
      ...this.optionalText('description', this.newSubject.description),
    }).subscribe({
      next: () => {
        this.saving = false;
        this.hideAddSubject();
        this.loadGradeSubjects();
      },
      error: (err) => {
        this.saving = false;
        this.actionError = `Could not create subject: ${this.getErrorMessage(err)}`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  editSubject(subject: ManagedSubject): void {
    if (this.saving) return;

    const name = prompt('Enter subject name:', subject.name);
    if (name === null) return;

    const code = prompt('Enter subject code:', subject.code || this.toCode(name || subject.name));
    if (code === null) return;

    const icon = prompt('Enter icon URL or icon name (optional):', subject.icon || '');
    if (icon === null) return;

    const description = prompt('Enter description (optional):', subject.description || '');
    if (description === null) return;

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      this.actionError = 'Subject name and code are required.';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.saving = true;
    this.actionError = null;
    this.dashboardService.updateSubject(subject.id, {
      name: trimmedName,
      code: trimmedCode,
      active: subject.active !== false,
      gradeIds: [this.gradeId],
      ...this.optionalText('icon', icon),
      ...this.optionalText('description', description),
    }).subscribe({
      next: () => {
        this.saving = false;
        this.loadGradeSubjects();
      },
      error: (err) => {
        this.saving = false;
        this.actionError = `Could not update subject: ${this.getErrorMessage(err)}`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  deleteSubject(subject: ManagedSubject): void {
    if (this.deletingSubjectId !== null
      || !confirm(`Are you sure you want to delete ${subject.name}? This will also delete its topics, levels, and questions.`)) {
      return;
    }

    this.deletingSubjectId = subject.id;
    this.actionError = null;
    this.dashboardService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.subjects = this.subjects.filter((item) => item.id !== subject.id);
        this.deletingSubjectId = null;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.deletingSubjectId = null;
        this.actionError = `Could not delete subject: ${this.getErrorMessage(err)}`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/grades']);
  }

  private mapGradeSubject(entry: ApiRecord): ManagedSubject | null {
    const nestedSubject = entry['subject'];
    const subjectRecord = this.isRecord(nestedSubject) ? nestedSubject : entry;
    const subjectId = this.getId(subjectRecord, 'id') ?? this.getId(entry, 'subjectId');
    if (subjectId === undefined) return null;

    return {
      id: subjectId,
      gradeSubjectId: this.getId(entry, 'id') ?? 0,
      name: this.getText(subjectRecord, 'name') || this.getText(entry, 'subjectName') || 'Subject',
      code: this.getText(subjectRecord, 'code'),
      icon: this.getText(subjectRecord, 'icon'),
      description: this.getText(subjectRecord, 'description'),
      active: this.getBoolean(subjectRecord, 'active'),
    };
  }

  private extractGradeSubjectEntries(
    gradeSubjectResponse: unknown,
    gradeResponse: unknown,
    subjectsResponse: unknown,
  ): ApiRecord[] {
    const directEntries = [
      ...this.extractList<ApiRecord>(gradeSubjectResponse, 'gradeSubjects'),
      ...this.extractList<ApiRecord>(gradeSubjectResponse, 'subjects'),
      ...this.extractList<ApiRecord>(gradeResponse, 'gradeSubjects'),
      ...this.extractList<ApiRecord>(gradeResponse, 'subjects'),
    ];

    if (directEntries.length > 0) {
      return directEntries;
    }

    return this.extractList<ApiRecord>(subjectsResponse, 'subjects')
      .filter((subject) => this.subjectBelongsToGrade(subject, this.gradeId));
  }

  private subjectBelongsToGrade(subject: ApiRecord, gradeId: number): boolean {
    const gradeSubjects = subject['gradeSubjects'];
    if (!Array.isArray(gradeSubjects)) return false;

    return gradeSubjects.some((entry) => {
      const gradeSubject = this.isRecord(entry) ? entry : null;
      if (!gradeSubject) return false;

      const directGradeId = this.getId(gradeSubject, 'gradeId');
      if (directGradeId === gradeId) return true;

      const grade = gradeSubject['grade'];
      return this.getId(grade, 'id') === gradeId;
    });
  }

  private extractGrade(response: unknown): Grade | null {
    const record = this.unwrapRecord(response, 'grade');
    if (!record) return null;

    const id = this.getId(record, 'id') ?? this.gradeId;
    return {
      id,
      name: this.getText(record, 'name') || `Grade #${id}`,
      code: this.getText(record, 'code'),
      stage: this.getText(record, 'stage'),
      active: this.getBoolean(record, 'active'),
    };
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];

    const data = response['data'];
    if (Array.isArray(data)) return data as T[];
    return this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private unwrapRecord(response: unknown, key: string): ApiRecord | null {
    if (!this.isRecord(response)) return null;
    if (this.isRecord(response[key])) return response[key];
    const data = response['data'];
    if (this.isRecord(data) && this.isRecord(data[key])) return data[key];
    if (this.isRecord(data)) return data;
    return response;
  }

  private getId(record: unknown, ...keys: string[]): number | undefined {
    if (!this.isRecord(record)) return undefined;

    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return undefined;
  }

  private getText(record: unknown, key: string): string | undefined {
    if (!this.isRecord(record)) return undefined;
    const value = record[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private getBoolean(record: unknown, key: string): boolean | undefined {
    if (!this.isRecord(record)) return undefined;
    return typeof record[key] === 'boolean' ? record[key] : undefined;
  }

  private optionalText(key: 'icon' | 'description', value: string | null | undefined): Partial<Record<'icon' | 'description', string>> {
    const text = value?.trim();
    return text ? { [key]: text } : {};
  }

  private emptySubjectForm(): NewSubjectForm {
    return {
      name: '',
      code: '',
      icon: '',
      description: '',
      active: true,
    };
  }

  private toCode(value: string): string {
    return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private getErrorMessage(error: unknown): string {
    if (this.isRecord(error)) {
      const nested = error['error'];
      if (this.isRecord(nested) && typeof nested['message'] === 'string') return nested['message'];
      if (typeof error['message'] === 'string') return error['message'];
    }

    return 'Please try again.';
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }
}
