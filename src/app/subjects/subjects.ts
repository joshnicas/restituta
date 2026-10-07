import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, skip } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';

interface GradeSummary {
  id: number;
  name: string;
  code: string;
  stage: string;
  active: boolean;
  gradeSubjectsCount: number;
  subjects: Subject[];
}

interface Subject {
  id: number;
  name: string;
  icon?: string;
  levelsCount: number;
  questionsCount: number;
  gradeSubjects?: Array<{ gradeId: number; id: number }>;
}

interface Topic {
  id: number;
  subjectId?: number;
  subject_id?: number;
  subject?: { id?: number | string };
  gradeSubjectTopics?: Array<{ gradeSubject: { grade: { id: number }; subject: { id: number } } }>;
}

interface Level {
  id: number;
  gradeSubject?: { grade: { id: number }; subject: { id: number } };
}

interface Question {
  id: number;
  gameLevel?: { gradeSubject: { grade: { id: number }; subject: { id: number } } };
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-subjects',
  imports: [CommonModule],
  templateUrl: './subjects.html',
  styleUrls: ['./subjects.scss']
})
export class Subjects implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  isGradeScoped = false;
  gradeId = 0;
  grade: GradeSummary | null = null;
  gradeSummaries: GradeSummary[] = [];
  subjects: Subject[] = [];
  loading = true;
  error: string | null = null;
  actionError: string | null = null;
  deletingSubjectId: number | null = null;

  get pageTitle(): string {
    if (this.isGradeScoped && this.grade) {
      return this.grade.name;
    }
    return this.t('subjects.title');
  }

  get pageIntro(): string {
    if (this.isGradeScoped && this.grade) {
      return `Subjects available for ${this.grade.name}.`;
    }
    return this.t('subjects.intro');
  }

  get emptyMessage(): string {
    if (this.isGradeScoped && this.grade) {
      return `No subjects found for ${this.grade.name}.`;
    }
    return this.t('subjects.noSubjects');
  }

  get downstreamQueryParams() {
    return this.isGradeScoped && this.gradeId > 0 ? { gradeId: this.gradeId } : {};
  }

  ngOnInit(): void {
    const requestedGradeId = Number(this.router.getCurrentNavigation()?.extras?.state?.['gradeId']
      || this.readQueryParam('gradeId'));

    if (Number.isSafeInteger(requestedGradeId) && requestedGradeId > 0) {
      this.gradeId = requestedGradeId;
      this.isGradeScoped = true;
    }

    this.loadSubjectsData();

    this.route.queryParamMap.pipe(skip(1)).subscribe(params => {
      const gradeId = Number(params.get('gradeId'));
      this.gradeId = Number.isSafeInteger(gradeId) && gradeId > 0 ? gradeId : 0;
      this.isGradeScoped = this.gradeId > 0;
      this.loadSubjectsData();
    });
  }

  private readQueryParam(key: string): number | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    return value && Number.isSafeInteger(Number(value)) ? Number(value) : null;
  }

  loadSubjectsData(): void {
    if (this.isGradeScoped) {
      this.loadGradeScopedSubjects();
    } else {
      this.loadAllGrades();
    }
  }

  loadAllGrades(): void {
    forkJoin({
      grades: this.dashboardService.getGrades(),
      subjects: this.dashboardService.getSubjects(),
    }).subscribe({
      next: ({ grades, subjects }) => {
        const gradeList = this.extractList<any>(grades, 'grades');
        const subjectList = this.extractList<Subject>(subjects, 'subjects');
        this.gradeSummaries = this.buildGradeSummaries(gradeList, subjectList);
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

  loadGradeScopedSubjects(): void {
    forkJoin({
      grades: this.dashboardService.getGrades(),
      subjects: this.dashboardService.getSubjectsByGrade(this.gradeId),
      topics: this.dashboardService.getTopics(),
      levels: this.dashboardService.getLevels(),
      questions: this.dashboardService.getQuestions(),
    }).subscribe({
      next: ({ grades, subjects, topics, levels, questions }) => {
        const gradeList = this.extractList<any>(grades, 'grades');
        const subjectList = this.extractList<Subject>(subjects, 'gradeSubjects');
        const topicList = this.extractList<Topic>(topics, 'topics');
        const levelList = this.extractList<Level>(levels, 'levels');
        const questionList = this.extractList<Question>(questions, 'questions');

        this.grade = this.buildGradeSummary(gradeList, this.gradeId);
        this.subjects = this.withSubjectCountsForGrade(subjectList, topicList, levelList, questionList, this.gradeId);

        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load subjects: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading subjects:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private buildGradeSummaries(grades: any[], subjects: Subject[]): GradeSummary[] {
    const gradeSubjectsCount = new Map<number, number>();
    const gradeSubjects = new Map<number, Subject[]>();

    for (const subject of subjects) {
      const gradeSubjectsList = this.asRecord(subject)['gradeSubjects'] as Array<{ gradeId: number }> | undefined;
      for (const gs of gradeSubjectsList ?? []) {
        const gradeId = this.getId(gs, 'gradeId');
        if (gradeId !== undefined) {
          gradeSubjectsCount.set(gradeId, (gradeSubjectsCount.get(gradeId) ?? 0) + 1);
          if (!gradeSubjects.has(gradeId)) {
            gradeSubjects.set(gradeId, []);
          }
          gradeSubjects.get(gradeId)!.push(subject);
        }
      }
    }

    return grades.map((grade) => {
      const gradeId = this.getId(grade, 'id');
      return {
        id: gradeId ?? 0,
        name: grade.name,
        code: grade.code,
        stage: grade.stage,
        active: grade.active,
        gradeSubjectsCount: gradeId === undefined ? 0 : gradeSubjectsCount.get(gradeId) ?? 0,
        subjects: gradeId === undefined ? [] : gradeSubjects.get(gradeId) ?? [],
      };
    });
  }

  private buildGradeSummary(grades: any[], gradeId: number): GradeSummary | null {
    const grade = grades.find((g) => this.getId(g, 'id') === gradeId);
    if (!grade) return null;
    return {
      id: this.getId(grade, 'id') ?? 0,
      name: grade.name,
      code: grade.code,
      stage: grade.stage,
      active: grade.active,
      gradeSubjectsCount: 0,
      subjects: [],
    };
  }

  private withSubjectCountsForGrade(
    gradeSubjects: any[],
    topics: Topic[],
    levels: Level[],
    questions: Question[],
    gradeId: number,
  ): Subject[] {
    // The API returns gradeSubject objects with nested subject data
    const subjects: Subject[] = gradeSubjects.map((gs) => {
      const subjectData = this.asRecord(gs)['subject'] as Record<string, unknown> | undefined;
      const subjectRecord = subjectData ? this.asRecord(subjectData) : this.asRecord(gs);
      return {
        id: this.getId(subjectData, 'id') ?? this.getId(gs, 'subjectId') ?? 0,
        name: typeof subjectRecord['name'] === 'string' ? subjectRecord['name'] : (typeof gs['subjectName'] === 'string' ? gs['subjectName'] : 'Subject'),
        icon: typeof subjectRecord['icon'] === 'string' ? subjectRecord['icon'] : undefined,
        levelsCount: 0,
        questionsCount: 0,
      };
    });

    const levelsCount = new Map<number, number>();
    const questionsCount = new Map<number, number>();

    for (const level of levels) {
      const gradeSubject = level.gradeSubject;
      const subjectId = gradeSubject?.subject?.id;
      const levelGradeId = gradeSubject?.grade?.id;
      if (levelGradeId === gradeId && subjectId !== undefined) {
        levelsCount.set(subjectId, (levelsCount.get(subjectId) ?? 0) + 1);
      }
    }

    for (const question of questions) {
      const gradeSubject = question.gameLevel?.gradeSubject;
      const subjectId = gradeSubject?.subject?.id;
      const questionGradeId = gradeSubject?.grade?.id;
      if (questionGradeId === gradeId && subjectId !== undefined) {
        questionsCount.set(subjectId, (questionsCount.get(subjectId) ?? 0) + 1);
      }
    }

    return subjects.map((subject) => {
      const subjectId = subject.id;
      return {
        ...subject,
        levelsCount: levelsCount.get(subjectId) ?? 0,
        questionsCount: questionsCount.get(subjectId) ?? 0,
      };
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

  onAddSubject(): void {
    this.router.navigate(['/subjects/add'], {
      queryParams: this.isGradeScoped && this.gradeId > 0 ? { gradeId: this.gradeId } : {},
    });
  }

  onAddQuestion(): void {
    this.router.navigate(['/questions/add']);
  }

  backToOverview(): void {
    this.router.navigate(['/subjects']);
  }

  manageGrade(gradeId: number): void {
    this.router.navigate(['/subjects', gradeId]);
  }

  deleteSubject(subject: Subject): void {
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
        this.actionError = `Could not delete the subject: ${err.message || 'Please try again.'}`;
        console.error('Error deleting subject:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }
}
