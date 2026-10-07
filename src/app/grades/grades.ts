import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';

type ApiRecord = Record<string, unknown>;

interface Grade {
  id: number;
  name: string;
  code: string;
  level: number;
  stage: string;
  active: boolean;
  subjectsCount: number;
  levelsCount: number;
  questionsCount: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  gradeSubjects?: Array<{ gradeId: number }>;
}

interface Level {
  id: number;
  gradeSubject?: { grade: { id: number } };
}

interface Question {
  id: number;
  gameLevel?: { gradeSubject: { grade: { id: number } } };
}

@Component({
  selector: 'app-grades',
  imports: [CommonModule, FormsModule],
  templateUrl: './grades.html',
  styleUrls: ['./grades.scss']
})
export class Grades implements OnInit {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  grades: Grade[] = [];
  loading = true;
  error: string | null = null;
  actionError: string | null = null;
  deletingGradeId: number | null = null;
  addingGrade = false;
  newGrade = {
    name: '',
    code: '',
    level: 0,
    stage: 'PRIMARY',
    active: true,
  };

  ngOnInit(): void {
    this.loadGradesData();
  }

  loadGradesData(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      grades: this.dashboardService.getGrades(),
      subjects: this.dashboardService.getSubjects(),
      levels: this.dashboardService.getLevels(),
      questions: this.dashboardService.getQuestions(),
    }).subscribe({
      next: ({ grades, subjects, levels, questions }) => {
        const gradeList = this.extractList<any>(grades, 'grades');
        const subjectList = this.extractList<Subject>(subjects, 'subjects');
        const levelList = this.extractList<Level>(levels, 'levels');
        const questionList = this.extractList<Question>(questions, 'questions');

        this.grades = this.withCounts(gradeList, subjectList, levelList, questionList);
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

  private withCounts(
    grades: any[],
    subjects: Subject[],
    levels: Level[],
    questions: Question[],
  ): Grade[] {
    const subjectsCount = new Map<number, number>();
    const levelsCount = new Map<number, number>();
    const questionsCount = new Map<number, number>();

    for (const subject of subjects) {
      const gradeSubjects = subject.gradeSubjects ?? [];
      for (const gs of gradeSubjects) {
        const gradeId = this.getId(gs, 'gradeId');
        if (gradeId !== undefined) {
          subjectsCount.set(gradeId, (subjectsCount.get(gradeId) ?? 0) + 1);
        }
      }
    }

    for (const level of levels) {
      const gradeId = this.getGradeId(level.gradeSubject);
      if (gradeId !== undefined) {
        levelsCount.set(gradeId, (levelsCount.get(gradeId) ?? 0) + 1);
      }
    }

    for (const question of questions) {
      const gradeId = this.getGradeId(question.gameLevel?.gradeSubject);
      if (gradeId !== undefined) {
        questionsCount.set(gradeId, (questionsCount.get(gradeId) ?? 0) + 1);
      }
    }

    return grades.map((grade) => {
      const gradeId = this.getId(grade, 'id');
      return {
        id: gradeId ?? 0,
        name: grade.name,
        code: grade.code,
        level: grade.level,
        stage: grade.stage,
        active: grade.active,
        subjectsCount: gradeId === undefined ? 0 : subjectsCount.get(gradeId) ?? 0,
        levelsCount: gradeId === undefined ? 0 : levelsCount.get(gradeId) ?? 0,
        questionsCount: gradeId === undefined ? 0 : questionsCount.get(gradeId) ?? 0,
      };
    });
  }

  private getGradeId(gradeSubject: { grade: { id: number } } | undefined): number | undefined {
    if (!gradeSubject) return undefined;
    return this.getId(gradeSubject.grade, 'id');
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];

    const data = response['data'];
    if (Array.isArray(data)) return data as T[];
    return this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private getId(record: object, ...keys: string[]): number | undefined {
    const values = record as ApiRecord;
    for (const key of keys) {
      const value = values[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    return undefined;
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }

  showAddGrade(): void {
    if (!this.addingGrade) {
      this.addingGrade = true;
      this.newGrade = { name: '', code: '', level: 0, stage: 'PRIMARY', active: true };
    }
  }

  hideAddGrade(): void {
    this.addingGrade = false;
    this.newGrade = { name: '', code: '', level: 0, stage: 'PRIMARY', active: true };
  }

  createGrade(): void {
    const name = this.newGrade.name.trim();
    const code = this.newGrade.code.trim();
    if (!name || !code || this.addingGrade === false) return;

    this.actionError = null;
    this.dashboardService.createGrade({
      curriculumVersionId: 1,
      name,
      code,
      level: this.newGrade.level,
      stage: this.newGrade.stage,
      active: this.newGrade.active,
    }).subscribe({
      next: () => {
        this.hideAddGrade();
        this.loadGradesData();
      },
      error: (err) => {
        this.actionError = this.t('grades.error.create', { message: err.message || 'Please try again.' });
        console.error('Error creating grade:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  editGrade(grade: Grade): void {
    const newName = prompt(this.t('grades.prompt.name'), grade.name);
    if (newName === null) return;

    const newCode = prompt(this.t('grades.prompt.code'), grade.code);
    if (newCode === null) return;

    const levelInput = prompt(this.t('grades.prompt.level'), grade.level.toString());
    if (levelInput === null) return;
    const level = parseInt(levelInput, 10);
    if (isNaN(level) || level < 0) {
      this.actionError = this.t('grades.validation.level');
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.actionError = null;
    this.dashboardService.updateGrade(grade.id, {
      name: newName.trim() || grade.name,
      code: newCode.trim() || grade.code,
      level,
      stage: grade.stage,
      active: grade.active,
    }).subscribe({
      next: () => {
        this.loadGradesData();
      },
      error: (err) => {
        this.actionError = this.t('grades.error.update', { message: err.message || 'Please try again.' });
        console.error('Error updating grade:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  deleteGrade(grade: Grade): void {
    if (this.deletingGradeId !== null
      || !confirm(this.t('grades.confirm.delete', { name: grade.name }))) {
      return;
    }

    this.deletingGradeId = grade.id;
    this.actionError = null;
    this.dashboardService.deleteGrade(grade.id).subscribe({
      next: () => {
        this.grades = this.grades.filter((g) => g.id !== grade.id);
        this.deletingGradeId = null;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.deletingGradeId = null;
        this.actionError = this.t('grades.error.delete', { message: err.message || 'Please try again.' });
        console.error('Error deleting grade:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  viewSubjects(gradeId: number): void {
    if (gradeId > 0) {
      this.router.navigate(['/subjects', gradeId]);
      return;
    }

    this.router.navigate(['/subjects']);
  }
}
