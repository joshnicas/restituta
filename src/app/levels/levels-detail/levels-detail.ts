import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

interface Level {
  id: number;
  gradeSubjectId?: number;
  levelNumber: number;
  name: string;
  description?: string;
  difficulty: string;
  requiredPoints: number;
  timeLimit?: number;
  active: boolean;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-levels-detail',
  imports: [CommonModule],
  templateUrl: './levels-detail.html',
  styleUrl: './levels-detail.scss',
})
export class LevelsDetail implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  gradeId: number | null = null;
  subjectId: number | null = null;
  gradeSubjectId: number | null = null;
  levels: Level[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.gradeId = this.readPositiveQueryId('gradeId');
    this.subjectId = this.readPositiveQueryId('subjectId');
    this.gradeSubjectId = this.readPositiveQueryId('gradeSubjectId');

    if (this.gradeSubjectId) {
      this.loadLevels();
    } else if (this.gradeId && this.subjectId) {
      this.loadGradeSubjectId();
    } else {
      this.error = 'Missing grade or subject ID';
      this.loading = false;
    }
  }

  loadGradeSubjectId(): void {
    this.dashboardService.getSubjectsByGrade(this.gradeId!).subscribe({
      next: (response) => {
        const gradeSubjectsList = [
          ...this.extractList<ApiRecord>(response, 'gradeSubjects'),
          ...this.extractList<ApiRecord>(response, 'subjects'),
        ];
        
        const gradeSubject = gradeSubjectsList.find((gs) => {
          const subjectData = this.asRecord(gs)['subject'] as Record<string, unknown> | undefined;
          const subjectRecord = subjectData ? this.asRecord(subjectData) : this.asRecord(gs);
          const subjectId = this.getId(subjectData, 'id') ?? this.getId(gs, 'subjectId') ?? this.getId(gs, 'id');
          const nestedGradeSubjects = subjectRecord['gradeSubjects'];
          const nestedGradeSubject = Array.isArray(nestedGradeSubjects)
            ? nestedGradeSubjects.find((entry) => this.getId(entry, 'gradeId') === this.gradeId)
            : undefined;

          if (subjectId === this.subjectId && this.getId(nestedGradeSubject, 'id') !== undefined) {
            this.gradeSubjectId = this.getId(nestedGradeSubject, 'id') ?? null;
          }

          return subjectId === this.subjectId;
        });

        if (gradeSubject) {
          this.gradeSubjectId = this.gradeSubjectId ?? this.getId(gradeSubject, 'gradeSubjectId', 'id') ?? 0;
          if (this.gradeSubjectId && this.gradeSubjectId > 0) {
            this.loadLevels();
          } else {
            this.loadLevelsFallback();
          }
        } else {
          this.loadLevelsFallback();
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load grade-subject: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading grade-subject:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadLevels(): void {
    this.dashboardService.getLevelsByGradeSubject(this.gradeSubjectId!).subscribe({
      next: (response) => {
        this.levels = this.mapLevels(this.extractList<ApiRecord>(response, 'levels'));
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load levels: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading levels:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadLevelsFallback(): void {
    this.dashboardService.getLevels().subscribe({
      next: (response) => {
        const levels = this.extractList<ApiRecord>(response, 'levels')
          .filter((level) => this.levelBelongsToSelection(level));
        this.levels = this.mapLevels(levels);
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load levels: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading levels:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/levels']);
  }

  addLevel(): void {
    if (!this.gradeSubjectId) {
      alert('Grade-subject ID is required to create a level');
      return;
    }

    const defaultLevelNumber = this.levels.length > 0
      ? Math.max(...this.levels.map(l => l.levelNumber)) + 1
      : 1;
    const levelNumber = prompt('Enter level number:', String(defaultLevelNumber));
    if (!levelNumber) return;

    const name = prompt('Enter level name:', `Level ${levelNumber}`);
    if (!name) return;

    const requiredPoints = prompt('Enter required points:');
    if (!requiredPoints) return;

    const difficulty = prompt('Enter difficulty (EASY, MEDIUM, HARD, EXPERT):') || 'EASY';

    const payload = {
      gradeSubjectId: this.gradeSubjectId,
      levelNumber: Number(levelNumber),
      name,
      requiredPoints: Number(requiredPoints),
      difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT',
      active: true,
    };

    this.dashboardService.createLevel(payload).subscribe({
      next: () => {
        this.loadLevels();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to create level: ${msg}`);
      }
    });
  }

  editLevel(levelId: number): void {
    const level = this.levels.find((l) => l.id === levelId);
    if (!level) return;

    const name = prompt('Enter level name:', level.name);
    if (name === null) return;

    const levelNumber = prompt('Enter level number:', String(level.levelNumber));
    if (levelNumber === null) return;

    const requiredPoints = prompt('Enter required points:', String(level.requiredPoints));
    if (requiredPoints === null) return;

    const difficulty = prompt('Enter difficulty (EASY, MEDIUM, HARD, EXPERT):', level.difficulty);
    if (difficulty === null) return;

    const active = confirm('Is this level active?');

    const payload: any = {};
    if (name !== level.name) payload.name = name;
    if (Number(levelNumber) !== level.levelNumber) payload.levelNumber = Number(levelNumber);
    if (Number(requiredPoints) !== level.requiredPoints) payload.requiredPoints = Number(requiredPoints);
    if (difficulty !== level.difficulty) payload.difficulty = difficulty;
    if (active !== level.active) payload.active = active;

    if (Object.keys(payload).length === 0) return;

    this.dashboardService.updateLevel(levelId, payload).subscribe({
      next: () => {
        this.loadLevels();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to update level: ${msg}`);
      }
    });
  }

  deleteLevel(levelId: number): void {
    const level = this.levels.find((l) => l.id === levelId);
    if (!level) return;

    if (!confirm(`Are you sure you want to delete "${level.name}"?`)) return;

    this.dashboardService.deleteLevel(levelId).subscribe({
      next: () => {
        this.loadLevels();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to delete level: ${msg}`);
      }
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

  private mapLevels(levels: ApiRecord[]): Level[] {
    return levels.map((level) => ({
      id: this.getId(level, 'id') ?? 0,
      gradeSubjectId: this.getId(level, 'gradeSubjectId'),
      levelNumber: this.getId(level, 'levelNumber') ?? 0,
      name: typeof level['name'] === 'string' ? level['name'] : 'Level',
      description: typeof level['description'] === 'string' ? level['description'] : undefined,
      difficulty: typeof level['difficulty'] === 'string' ? level['difficulty'] : 'EASY',
      requiredPoints: this.getId(level, 'requiredPoints') ?? 0,
      timeLimit: this.getId(level, 'timeLimit'),
      active: typeof level['active'] === 'boolean' ? level['active'] : true,
    })).filter((level) => level.id > 0)
      .sort((a, b) => a.levelNumber - b.levelNumber);
  }

  private levelBelongsToSelection(level: ApiRecord): boolean {
    const directGradeSubjectId = this.getId(level, 'gradeSubjectId');
    if (this.gradeSubjectId && directGradeSubjectId === this.gradeSubjectId) return true;

    const gradeSubject = level['gradeSubject'];
    if (this.isRecord(gradeSubject)) {
      const gradeId = this.getId(gradeSubject, 'gradeId') ?? this.getId(gradeSubject['grade'], 'id');
      const subjectId = this.getId(gradeSubject, 'subjectId') ?? this.getId(gradeSubject['subject'], 'id');
      return gradeId === this.gradeId && subjectId === this.subjectId;
    }

    const gradeSubjectTopic = level['gradeSubjectTopic'];
    if (this.isRecord(gradeSubjectTopic) && this.isRecord(gradeSubjectTopic['gradeSubject'])) {
      const nestedGradeSubject = gradeSubjectTopic['gradeSubject'];
      const gradeId = this.getId(nestedGradeSubject, 'gradeId') ?? this.getId(nestedGradeSubject['grade'], 'id');
      const subjectId = this.getId(nestedGradeSubject, 'subjectId') ?? this.getId(nestedGradeSubject['subject'], 'id');
      return gradeId === this.gradeId && subjectId === this.subjectId;
    }

    return false;
  }

  private readPositiveQueryId(key: string): number | null {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
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
