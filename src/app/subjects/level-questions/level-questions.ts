import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { QuestionMedia } from '../../models/educational.models';
import { InlineQuestionTextComponent } from '../../questions/inline-question-text.component';
import { getInlineQuestionImageError } from '../../questions/inline-question-text';

interface Question {
  id: number;
  gameLevelId?: number;
  gameLevel?: { id?: number | string };
  text: string;
  image?: string;
  audio?: string;
  explanation?: string;
  points: number;
  timeLimit?: number;
  context?: { grade: { id: number }; level: { id: number; levelNumber: number } };
  gameType?: { id: number; name: string; code: string };
  options?: Array<{ text?: string; image?: string; isCorrect: boolean; order: number }>;
  trueFalseAnswer?: boolean | null;
  matchingPairs?: Array<{ leftText?: string; rightText?: string; order: number }>;
  orderingItems?: Array<{ text?: string; correctOrder: number }>;
  acceptedAnswers?: Array<{ answer: string; isCaseSensitive: boolean }>;
  media?: QuestionMedia[];
}

interface Level {
  id: number;
  levelNumber?: number;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-level-questions',
  imports: [CommonModule, InlineQuestionTextComponent],
  templateUrl: './level-questions.html',
  styleUrls: ['./level-questions.scss']
})
export class LevelQuestions implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  subjectId: number;
  levelId: number;
  level: Level | null = null;
  questions: Question[] = [];
  loading = true;
  error: string | null = null;

  constructor() {
    this.subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    this.levelId = Number(this.route.snapshot.paramMap.get('levelId'));
  }

  ngOnInit(): void {
    this.loadLevelData();
  }

  loadLevelData(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getLevel(this.levelId).subscribe({
      next: (response) => {
        const levelList = this.extractList<Level>(response, 'levels');
        const singleLevel = this.extractOne<Level>(response, 'level');
        const levels = levelList.length > 0 ? levelList : (singleLevel ? [singleLevel] : []);
        this.level = levels.find(l => this.getId(l, 'id') === this.levelId) || null;

        if (!this.level) {
          this.error = 'Level not found';
          this.loading = false;
          this.changeDetectorRef.markForCheck();
          return;
        }

        this.loadQuestions();
      },
      error: (err) => {
        this.error = `Failed to load level: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading level:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getQuestionsByLevel(this.levelId).subscribe({
      next: (response) => {
        this.questions = this.extractList<Question>(response, 'questions');
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load questions: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading questions:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private getGameLevelId(question: Question): number | undefined {
    const directId = this.getId(question, 'gameLevelId');
    if (directId !== undefined) return directId;

    const context = question.context;
    if (context?.level?.id !== undefined) {
      return context.level.id;
    }

    const nested = this.asRecord(question)['gameLevel'];
    if (this.isRecord(nested)) {
      return this.getId(nested, 'id');
    }

    return undefined;
  }

  goBack(): void {
    this.router.navigate(['/subjects', this.subjectId]);
  }

  addQuestion(): void {
    this.router.navigate(['/questions/add'], {
      queryParams: { levelId: this.levelId },
    });
  }

  deleteQuestion(questionId: number): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.dashboardService.deleteQuestion(questionId).subscribe({
        next: () => {
          this.loadQuestions();
        },
        error: (err) => {
          console.error('Error deleting question:', err);
          alert('Failed to delete question. Please try again.');
        }
      });
    }
  }

  editQuestion(question: Question): void {
    const newText = prompt('Enter question text:', question.text);
    if (newText === null) return;

    const newExplanation = prompt('Enter explanation (leave empty to keep current):', question.explanation || '');
    if (newExplanation === null) return;

    const pointsInput = prompt('Enter points:', question.points.toString());
    if (pointsInput === null) return;
    const points = parseInt(pointsInput, 10);
    if (isNaN(points) || points < 0) {
      alert('Points must be a positive number.');
      return;
    }

    const timeLimitInput = prompt('Enter time limit in seconds (leave empty for none):', question.timeLimit?.toString() || '');
    if (timeLimitInput === null) return;
    const timeLimit = timeLimitInput.trim() ? parseInt(timeLimitInput, 10) : null;
    if (timeLimit !== null && (isNaN(timeLimit) || timeLimit < 0)) {
      alert('Time limit must be a positive number.');
      return;
    }

    const updateData: any = {
      text: newText,
      explanation: newExplanation.trim() || null,
      points,
      timeLimit,
    };

    this.dashboardService.updateQuestion(question.id, updateData).subscribe({
      next: () => {
        this.loadQuestions();
      },
      error: (err) => {
        console.error('Error updating question:', err);
        alert('Failed to update question. Please try again.');
      }
    });
  }

  getInlineQuestionImageError(question: Question): string | null {
    return getInlineQuestionImageError(question.text, question.media, question.image);
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];

    const data = response['data'];
    if (Array.isArray(data)) return data as T[];
    return this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private extractOne<T>(response: unknown, key: string): T | null {
    if (!this.isRecord(response)) return null;
    const value = response[key];
    if (this.isRecord(value)) return value as T;
    const data = response['data'];
    if (this.isRecord(data)) {
      const nested = data[key];
      if (this.isRecord(nested)) return nested as T;
    }
    return null;
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
