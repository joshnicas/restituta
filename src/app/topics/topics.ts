import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';

interface Grade {
  id: number;
  name: string;
  code: string;
  stage: string;
  active: boolean;
}

interface Subject {
  id: number;
  gradeSubjectId?: number;
  name: string;
  code?: string;
  gradeSubjects?: Array<{ gradeId: number; id: number }>;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-topics',
  imports: [CommonModule, FormsModule],
  templateUrl: './topics.html',
  styleUrl: './topics.scss',
})
export class Topics implements OnInit {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  grades: Grade[] = [];
  subjects: Subject[] = [];
  selectedGradeId: number | null = null;
  selectedSubjectId: number | null = null;
  loading = true;
  loadingSubjects = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadGrades();
  }

  loadGrades(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getGrades().subscribe({
      next: (response) => {
        const gradeList = this.extractList<Grade>(response, 'grades');
        this.grades = gradeList.map((grade) => ({
          id: this.getId(grade, 'id') ?? 0,
          name: grade.name,
          code: grade.code,
          stage: grade.stage,
          active: grade.active,
        }));
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load grades: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading grades:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  onGradeSelect(gradeId: number | string): void {
    const nextGradeId = Number(gradeId);
    if (!Number.isSafeInteger(nextGradeId) || nextGradeId <= 0) return;

    if (this.selectedGradeId === nextGradeId) return;

    this.selectedGradeId = nextGradeId;
    this.selectedSubjectId = null;
    this.loadSubjects(nextGradeId);
  }

  loadSubjects(gradeId: number): void {
    this.loadingSubjects = true;
    this.error = null;
    this.dashboardService.getSubjectsByGrade(gradeId).subscribe({
      next: (response) => {
        let gradeSubjectsList: any[] = [];
        
        if (Array.isArray(response)) {
          gradeSubjectsList = response;
        } else if (this.isRecord(response)) {
          const keys = ['gradeSubjects', 'subjects', 'grade_subjects', 'data'];
          for (const key of keys) {
            if (Array.isArray(response[key])) {
              gradeSubjectsList = response[key];
              break;
            }
          }
          if (gradeSubjectsList.length === 0 && response['success'] === true) {
            for (const key of Object.keys(response)) {
              if (key !== 'success' && key !== 'message' && Array.isArray(response[key])) {
                gradeSubjectsList = response[key];
                break;
              }
            }
          }
        }
        
        this.subjects = gradeSubjectsList.map((gs) => {
          const subjectData = this.asRecord(gs)['subject'] as Record<string, unknown> | undefined;
          const subjectRecord = subjectData ? this.asRecord(subjectData) : this.asRecord(gs);
          const subjectId = this.getId(subjectData, 'id') ?? this.getId(gs, 'subjectId') ?? this.getId(gs, 'id') ?? 0;
          const nestedGradeSubjects = subjectRecord['gradeSubjects'];
          const nestedGradeSubject = Array.isArray(nestedGradeSubjects)
            ? nestedGradeSubjects.find((entry) => this.getId(entry, 'gradeId') === gradeId)
            : undefined;

          return {
            id: subjectId,
            gradeSubjectId: subjectData ? this.getId(gs, 'id') : (this.getId(nestedGradeSubject, 'id') ?? this.getId(gs, 'gradeSubjectId')),
            name: typeof subjectRecord['name'] === 'string' ? subjectRecord['name'] : 'Subject',
            code: typeof subjectRecord['code'] === 'string' ? subjectRecord['code'] : undefined,
          };
        }).filter((subject) => subject.id > 0);
        this.loadingSubjects = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load subjects: ${err.message || 'Unknown error'}`;
        this.loadingSubjects = false;
        console.error('Error loading subjects:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  onSubjectSelect(subjectId: number | string | null): void {
    const selectedId = Number(subjectId);
    this.selectedSubjectId = Number.isSafeInteger(selectedId) && selectedId > 0 ? selectedId : null;
    this.changeDetectorRef.markForCheck();
  }

  navigateToTopicManagement(): void {
    if (this.selectedGradeId && this.selectedSubjectId) {
      const selectedSubject = this.subjects.find((subject) => subject.id === this.selectedSubjectId);
      this.router.navigate(['/topics-detail'], {
        queryParams: {
          gradeId: this.selectedGradeId,
          subjectId: this.selectedSubjectId,
          ...(selectedSubject?.gradeSubjectId ? { gradeSubjectId: selectedSubject.gradeSubjectId } : {}),
        },
      });
    }
  }

  backToGrades(): void {
    this.selectedGradeId = null;
    this.selectedSubjectId = null;
    this.subjects = [];
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];
    const data = response['data'];
    if (Array.isArray(data)) return data as T[];
    return this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private getId(record: unknown, ...keys: string[]): number | undefined {
    if (!this.isRecord(record)) return undefined;
    const values = this.asRecord(record);
    for (const key of keys) {
      const value = values[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    return undefined;
  }

  private asRecord(value: object): ApiRecord {
    return value as unknown as ApiRecord;
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }
}
