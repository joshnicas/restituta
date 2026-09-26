import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../services/dashboard.service';
import { Grade, GradeSubject, Topic, GameLevel, GameType, Question } from '../models/educational.models';
import { InlineQuestionTextComponent } from './inline-question-text.component';
import { getInlineQuestionImageError } from './inline-question-text';

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-manage-questions',
  imports: [CommonModule, FormsModule, InlineQuestionTextComponent],
  templateUrl: './manage-questions.html',
  styleUrl: './manage-questions.scss',
})
export class ManageQuestions implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  grades: Grade[] = [];
  gradeSubjects: GradeSubject[] = [];
  topics: Topic[] = [];
  levels: GameLevel[] = [];
  gameTypes: GameType[] = [];
  questions: Question[] = [];
  filteredQuestions: Question[] = [];

  selectedGradeId: number | null = null;
  selectedGradeSubjectId: number | null = null;
  filterTopicId: number | null = null;
  filterLevelId: number | null = null;
  filterGameTypeId: number | null = null;

  loading = true;
  loadingSubjects = false;
  loadingQuestions = false;
  loadingTopics = false;
  loadingLevels = false;
  loadingGameTypes = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadGrades();
  }

  get selectedGrade(): Grade | null {
    return this.grades.find((grade) => grade.id === this.selectedGradeId) ?? null;
  }

  get selectedGradeSubject(): GradeSubject | null {
    return this.gradeSubjects.find((gradeSubject) => gradeSubject.id === this.selectedGradeSubjectId) ?? null;
  }

  get selectedTopic(): Topic | null {
    return this.topics.find((topic) => topic.id === this.filterTopicId) ?? null;
  }

  get selectedLevel(): GameLevel | null {
    return this.levels.find((level) => level.id === this.filterLevelId) ?? null;
  }

  get selectedGameType(): GameType | null {
    return this.gameTypes.find((gameType) => gameType.id === this.filterGameTypeId) ?? null;
  }

  get activeFilterSummary(): Array<{ label: string; value: string }> {
    const summary: Array<{ label: string; value: string }> = [];

    if (this.selectedGrade?.name) {
      summary.push({ label: 'Grade', value: this.selectedGrade.name });
    }

    if (this.selectedGradeSubject?.subject?.name) {
      summary.push({ label: 'Subject', value: this.selectedGradeSubject.subject.name });
    }

    if (this.selectedTopic?.name) {
      summary.push({ label: 'Topic', value: this.selectedTopic.name });
    }

    if (this.selectedLevel) {
      summary.push({ label: 'Level', value: `Level ${this.selectedLevel.levelNumber} - ${this.selectedLevel.name}` });
    }

    if (this.selectedGameType?.name) {
      summary.push({ label: 'Game Type', value: this.selectedGameType.name });
    }

    return summary;
  }

  isMultipleChoice(question: Question): boolean {
    const code = question.gameType?.code?.toUpperCase() ?? '';
    const name = question.gameType?.name?.toLowerCase() ?? '';
    return code === 'MULTIPLE_CHOICE' || name.includes('multiple choice');
  }

  isTrueFalse(question: Question): boolean {
    const code = question.gameType?.code?.toUpperCase() ?? '';
    const name = question.gameType?.name?.toLowerCase() ?? '';
    return code === 'TRUE_FALSE' || name.includes('true / false') || name.includes('true false');
  }

  isOrdering(question: Question): boolean {
    const code = question.gameType?.code?.toUpperCase() ?? '';
    const name = question.gameType?.name?.toLowerCase() ?? '';
    return code === 'ORDERING' || name.includes('ordering');
  }

  isMatching(question: Question): boolean {
    const code = question.gameType?.code?.toUpperCase() ?? '';
    const name = question.gameType?.name?.toLowerCase() ?? '';
    return code === 'MATCHING' || name.includes('matching');
  }

  isFillInTheBlank(question: Question): boolean {
    const code = question.gameType?.code?.toUpperCase() ?? '';
    const name = question.gameType?.name?.toLowerCase() ?? '';
    return code === 'FILL_IN_THE_BLANK' || name.includes('fill in the blank') || name.includes('fill in blanks');
  }

  getFillInBlankAnswer(question: Question): string {
    const acceptedAnswer = question.acceptedAnswers?.[0]?.answer?.trim();
    if (acceptedAnswer) return acceptedAnswer;

    const orderingAnswer = question.orderingItems?.length
      ? question.orderingItems
          .slice()
          .sort((a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0))
          .map((item) => item.text || item.image || 'Item')
      : [];
    if (orderingAnswer.length > 0) return orderingAnswer.join(' ');

    if (typeof (question as any).answer === 'string' && (question as any).answer.trim()) {
      return (question as any).answer.trim();
    }

    return 'N/A';
  }

  getInlineQuestionImageError(question: Question): string | null {
    return getInlineQuestionImageError(question.text, question.media, question.image);
  }

  mediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    return /^https?:\/\//i.test(url)
      ? url
      : `${this.dashboardService.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  questionAudios(question: Question): Array<{ url: string; altText: string | null }> {
    return (question.media ?? [])
      .filter((media) => media.type === 'AUDIO' && !!media.url)
      .map((media) => ({ url: media.url, altText: media.altText ?? null }));
  }

  loadGrades(): void {
    this.loading = true;
    this.error = null;
    this.dashboardService.getGrades().pipe(take(1)).subscribe({
      next: (data) => {
        this.grades = this.extractList<Grade>(data, 'grades');
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load grades. Please try again.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  selectGrade(gradeId: number | null): void {
    if (!gradeId) {
      this.selectedGradeId = null;
      this.selectedGradeSubjectId = null;
      this.gradeSubjects = [];
      this.topics = [];
      this.levels = [];
      this.questions = [];
      this.filteredQuestions = [];
      return;
    }

    this.selectedGradeId = gradeId;
    this.selectedGradeSubjectId = null;
    this.filterTopicId = null;
    this.filterLevelId = null;
    this.filterGameTypeId = null;
    this.questions = [];
    this.filteredQuestions = [];
    this.loadSubjectsForGrade(gradeId);
  }

  loadSubjectsForGrade(gradeId: number): void {
    this.loadingSubjects = true;
    this.error = null;
    const expectedGradeId = gradeId;
    this.dashboardService.getSubjectsByGrade(gradeId).pipe(take(1)).subscribe({
      next: (data) => {
        if (this.selectedGradeId !== expectedGradeId) return;
        const rawGradeSubjects = this.extractFlexibleList(data, ['gradeSubjects', 'subjects', 'grade_subjects']);
        this.gradeSubjects = rawGradeSubjects
          .map((entry) => this.mapGradeSubject(entry))
          .filter((gradeSubject): gradeSubject is GradeSubject => gradeSubject !== null);
        this.loadingSubjects = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingSubjects = false;
        this.error = 'Could not load subjects for this grade. Please try again.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  selectGradeSubject(gradeSubjectId: number | null): void {
    if (!gradeSubjectId) {
      this.selectedGradeSubjectId = null;
      this.filterTopicId = null;
      this.filterLevelId = null;
      this.filterGameTypeId = null;
      this.topics = [];
      this.levels = [];
      this.questions = [];
      this.filteredQuestions = [];
      return;
    }

    this.selectedGradeSubjectId = gradeSubjectId;
    this.filterTopicId = null;
    this.filterLevelId = null;
    this.filterGameTypeId = null;
    this.loadQuestionsAndFilters(gradeSubjectId);
  }

  loadQuestionsAndFilters(gradeSubjectId: number): void {
    this.loadingQuestions = true;
    this.loadingTopics = true;
    this.loadingLevels = true;
    this.loadingGameTypes = true;
    this.error = null;
    const expectedGradeSubjectId = gradeSubjectId;

    // Load topics
    this.dashboardService.getTopicsByGradeSubject(gradeSubjectId).pipe(take(1)).subscribe({
      next: (data) => {
        if (this.selectedGradeSubjectId !== expectedGradeSubjectId) return;
        this.topics = this.extractList<ApiRecord>(data, 'topics')
          .map((entry) => this.mapTopic(entry))
          .filter((topic): topic is Topic => topic !== null);
        this.loadingTopics = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingTopics = false;
        this.changeDetectorRef.markForCheck();
      },
    });

    // Load levels
    this.dashboardService.getLevelsByGradeSubject(gradeSubjectId).pipe(take(1)).subscribe({
      next: (data) => {
        if (this.selectedGradeSubjectId !== expectedGradeSubjectId) return;
        this.levels = this.extractList<GameLevel>(data, 'levels');
        this.loadingLevels = false;
        this.loadQuestionsForLevels(this.levels, expectedGradeSubjectId);
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingLevels = false;
        this.changeDetectorRef.markForCheck();
      },
    });

    // Load game types
    this.dashboardService.getGameTypes().pipe(take(1)).subscribe({
      next: (data) => {
        this.gameTypes = this.extractList<ApiRecord>(data, 'gameTypes')
          .map((entry) => this.mapGameType(entry))
          .filter((gameType): gameType is GameType => gameType !== null);
        this.loadingGameTypes = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingGameTypes = false;
        this.changeDetectorRef.markForCheck();
      },
    });

  }

  private loadQuestionsForLevels(levels: GameLevel[], expectedGradeSubjectId: number): void {
    this.loadingQuestions = true;

    if (levels.length === 0) {
      this.questions = [];
      this.filteredQuestions = [];
      this.loadingQuestions = false;
      this.changeDetectorRef.markForCheck();
      return;
    }

    forkJoin(
      levels.map((level) =>
        this.dashboardService.getQuestionsByLevel(level.id, {
          topicId: this.filterTopicId,
          gameTypeId: this.filterGameTypeId,
        }).pipe(
          take(1),
          catchError(() => of({ questions: [] as Question[] })),
        ),
      ),
    ).subscribe({
      next: (questionGroups) => {
        if (this.selectedGradeSubjectId !== expectedGradeSubjectId) return;
        const questions = questionGroups.flatMap((group, index) => {
          const level = levels[index];
          return this.extractFlexibleQuestions(group).map((question) => this.attachLevelContext(question, level));
        });
        this.questions = questions;
        this.applyFilters();
        this.loadingQuestions = false;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.loadingQuestions = false;
        this.error = 'Could not load questions. Please try again.';
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  applyFilters(): void {
    if (!this.selectedGradeId || !this.selectedGradeSubjectId) {
      this.filteredQuestions = [];
      return;
    }

    this.filteredQuestions = this.questions.filter((question) =>
      (!this.filterTopicId || this.getQuestionTopicId(question) === this.filterTopicId)
      && (!this.filterLevelId || this.getQuestionLevelId(question) === this.filterLevelId)
      && (!this.filterGameTypeId || this.getQuestionGameTypeId(question) === this.filterGameTypeId),
    );
  }

  onFilterChange(): void {
    this.applyFilters();
    this.changeDetectorRef.markForCheck();
  }

  clearFilters(): void {
    this.filterTopicId = null;
    this.filterLevelId = null;
    this.filterGameTypeId = null;
    this.applyFilters();
    this.changeDetectorRef.markForCheck();
  }

  deleteQuestion(questionId: number): void {
    if (!confirm('Are you sure you want to delete this question?')) return;

    this.dashboardService.deleteQuestion(questionId).subscribe({
      next: () => {
        this.questions = this.questions.filter((q) => q.id !== questionId);
        this.applyFilters();
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to delete question: ${err.message || 'Unknown error'}`;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  getTopicName(topicId: number | null): string {
    if (!topicId) return 'N/A';
    const topic = this.topics.find((t) => t.id === topicId);
    return topic?.name || 'N/A';
  }

  getTopicNameFromQuestion(question: Question): string {
    return question.topic?.name || 'N/A';
  }

  getLevelName(levelId: number): string {
    const level = this.levels.find((l) => l.id === levelId);
    return level ? `Level ${level.levelNumber} - ${level.name}` : 'N/A';
  }

  getLevelNameFromQuestion(question: Question): string {
    const levelId = question.gameLevel?.id ?? (question as any).gameLevelId;
    const level = this.levels.find((l) => l.id === levelId);
    return level ? `Level ${level.levelNumber} - ${level.name}` : 'N/A';
  }

  getGameTypeName(gameTypeId: number): string {
    const gameType = this.gameTypes.find((gt) => gt.id === gameTypeId);
    return gameType?.name || 'N/A';
  }

  getGameTypeNameFromQuestion(question: Question): string {
    return question.gameType?.name || 'N/A';
  }

  private extractList<T>(response: unknown, key: string): T[] {
    if (Array.isArray(response)) return response as T[];
    if (!this.isRecord(response)) return [];
    if (Array.isArray(response[key])) return response[key] as T[];
    const data = response['data'];
    return Array.isArray(data) ? data as T[] : this.isRecord(data) && Array.isArray(data[key]) ? data[key] as T[] : [];
  }

  private extractFlexibleList(response: unknown, keys: string[]): ApiRecord[] {
    if (Array.isArray(response)) return response as ApiRecord[];
    if (!this.isRecord(response)) return [];

    for (const key of keys) {
      const direct = response[key];
      if (Array.isArray(direct)) return direct as ApiRecord[];
    }

    const data = response['data'];
    if (Array.isArray(data)) return data as ApiRecord[];
    if (this.isRecord(data)) {
      for (const key of keys) {
        const nested = data[key];
        if (Array.isArray(nested)) return nested as ApiRecord[];
      }
    }

    return [];
  }

  private extractFlexibleQuestions(response: unknown): Question[] {
    const records = this.extractFlexibleList(response, ['questions', 'question', 'data', 'items', 'results']);
    if (records.length > 0) {
      return records
        .map((entry) => this.mapQuestion(entry))
        .filter((question): question is Question => question !== null);
    }

    if (Array.isArray(response)) {
      return response
        .map((entry) => this.mapQuestion(entry as ApiRecord))
        .filter((question): question is Question => question !== null);
    }

    return [];
  }

  private mapGradeSubject(entry: ApiRecord): GradeSubject | null {
    const subjectData = this.isRecord(entry['subject']) ? (entry['subject'] as ApiRecord) : undefined;
    const subjectRecord = subjectData ?? entry;
    const subjectId = this.getId(subjectData, 'id') ?? this.getId(entry, 'subjectId') ?? this.getId(entry, 'id');

    if (subjectId === undefined) return null;

    return {
      id: this.getId(entry, 'id') ?? subjectId,
      gradeId: this.getId(entry, 'gradeId') ?? this.selectedGradeId ?? 0,
      subjectId,
      name: typeof subjectRecord['name'] === 'string' ? subjectRecord['name'] : 'Subject',
      subject: {
        id: subjectId,
        name: typeof subjectRecord['name'] === 'string' ? subjectRecord['name'] : 'Subject',
        code: typeof subjectRecord['code'] === 'string' ? subjectRecord['code'] : '',
        icon: typeof subjectRecord['icon'] === 'string' ? subjectRecord['icon'] : undefined,
      },
    };
  }

  private mapTopic(entry: ApiRecord): Topic | null {
    const topicId = this.getId(entry, 'id', 'topicId');
    if (topicId === undefined) return null;

    return {
      id: topicId,
      name: typeof entry['name'] === 'string' ? entry['name'] : 'Topic',
      code: typeof entry['code'] === 'string' ? entry['code'] : '',
      description: typeof entry['description'] === 'string' ? entry['description'] : null,
      active: typeof entry['active'] === 'boolean' ? entry['active'] : true,
      subjectId: this.getId(entry, 'subjectId'),
    };
  }

  private mapGameType(entry: ApiRecord): GameType | null {
    const gameTypeId = this.getId(entry, 'id', 'gameTypeId');
    if (gameTypeId === undefined) return null;

    return {
      id: gameTypeId,
      name: typeof entry['name'] === 'string' ? entry['name'] : 'Game Type',
      code: typeof entry['code'] === 'string' ? entry['code'] : '',
      description: typeof entry['description'] === 'string' ? entry['description'] : null,
    };
  }

  private mapQuestion(entry: ApiRecord): Question | null {
    const questionId = this.getId(entry, 'id', 'questionId');
    if (questionId === undefined) return null;

    const gameLevel = this.isRecord(entry['gameLevel']) ? (entry['gameLevel'] as ApiRecord) : undefined;
    const topic = this.isRecord(entry['topic']) ? (entry['topic'] as ApiRecord) : undefined;
    const gameType = this.isRecord(entry['gameType']) ? (entry['gameType'] as ApiRecord) : undefined;
    const gradeSubject = gameLevel && this.isRecord(gameLevel['gradeSubject']) ? (gameLevel['gradeSubject'] as ApiRecord) : undefined;
    const grade = gradeSubject && this.isRecord(gradeSubject['grade']) ? (gradeSubject['grade'] as ApiRecord) : undefined;
    const subject = gradeSubject && this.isRecord(gradeSubject['subject']) ? (gradeSubject['subject'] as ApiRecord) : undefined;

    return {
      id: questionId,
      text: typeof entry['text'] === 'string' ? entry['text'] : '',
      image: typeof entry['image'] === 'string' ? entry['image'] : null,
      audio: typeof entry['audio'] === 'string' ? entry['audio'] : null,
      explanation: typeof entry['explanation'] === 'string' ? entry['explanation'] : null,
      points: this.getId(entry, 'points') ?? 0,
      timeLimit: this.getId(entry, 'timeLimit'),
      active: typeof entry['active'] === 'boolean' ? entry['active'] : true,
      topic: topic ? {
        id: this.getId(topic, 'id', 'topicId') ?? this.getId(entry, 'topicId') ?? 0,
        name: typeof topic['name'] === 'string' ? topic['name'] : 'Topic',
      } : (this.getId(entry, 'topicId') ? {
        id: this.getId(entry, 'topicId') ?? 0,
        name: 'Topic',
      } : undefined),
      gameType: {
        id: this.getId(gameType, 'id', 'gameTypeId') ?? this.getId(entry, 'gameTypeId') ?? 0,
        name: typeof gameType?.['name'] === 'string' ? gameType['name'] as string : 'Game Type',
        code: typeof gameType?.['code'] === 'string' ? gameType['code'] as string : '',
      },
      gameLevel: gameLevel ? {
        id: this.getId(gameLevel, 'id', 'gameLevelId') ?? this.getId(entry, 'gameLevelId') ?? 0,
        gradeSubject: {
          id: this.getId(gameLevel['gradeSubject'] as ApiRecord, 'id', 'gradeSubjectId') ?? this.getId(entry, 'gradeSubjectId') ?? 0,
          grade: {
            id: this.getId(grade, 'id') ?? 0,
            name: typeof grade?.['name'] === 'string' ? grade['name'] as string : '',
          },
          subject: {
            id: this.getId(subject, 'id') ?? 0,
            name: typeof subject?.['name'] === 'string' ? subject['name'] as string : '',
          },
        },
      } : undefined,
      options: Array.isArray(entry['options'])
        ? (entry['options'] as ApiRecord[]).map((option, index) => ({
            text: typeof option['text'] === 'string' ? option['text'] : null,
            image: typeof option['image'] === 'string' ? option['image'] : null,
            audio: typeof option['audio'] === 'string' ? option['audio'] : null,
            isCorrect: typeof option['isCorrect'] === 'boolean' ? option['isCorrect'] : false,
            order: this.getId(option, 'order') ?? index,
          }))
        : undefined,
      matchingPairs: Array.isArray(entry['matchingPairs'])
        ? (entry['matchingPairs'] as ApiRecord[]).map((pair, index) => ({
            leftText: typeof pair['leftText'] === 'string' ? pair['leftText'] : null,
            leftImage: typeof pair['leftImage'] === 'string' ? pair['leftImage'] : null,
            rightText: typeof pair['rightText'] === 'string' ? pair['rightText'] : null,
            rightImage: typeof pair['rightImage'] === 'string' ? pair['rightImage'] : null,
            order: this.getId(pair, 'order') ?? index,
          }))
        : undefined,
      orderingItems: Array.isArray(entry['orderingItems'])
        ? (entry['orderingItems'] as ApiRecord[]).map((item, index) => ({
            text: typeof item['text'] === 'string' ? item['text'] : null,
            image: typeof item['image'] === 'string' ? item['image'] : null,
            correctOrder: this.getId(item, 'correctOrder') ?? index,
          }))
        : undefined,
      acceptedAnswers: Array.isArray(entry['acceptedAnswers'])
        ? (entry['acceptedAnswers'] as ApiRecord[]).map((answer) => ({
            answer: typeof answer['answer'] === 'string' ? answer['answer'] : '',
            isCaseSensitive: typeof answer['isCaseSensitive'] === 'boolean' ? answer['isCaseSensitive'] : false,
          }))
        : undefined,
      media: Array.isArray(entry['media'])
        ? (entry['media'] as ApiRecord[])
          .filter((media) => media['type'] === 'IMAGE' || media['type'] === 'AUDIO')
          .map((media, index) => ({
            type: media['type'] as 'IMAGE' | 'AUDIO',
            url: typeof media['url'] === 'string' ? media['url'] : '',
            altText: typeof media['altText'] === 'string' ? media['altText'] : null,
            order: this.getId(media, 'order') ?? index,
          }))
        : undefined,
    };
  }

  private attachLevelContext(question: Question, level: GameLevel): Question {
    return {
      ...question,
      gameLevel: {
        id: level.id,
        gradeSubject: {
          id: level.gradeSubjectId,
          grade: {
            id: this.selectedGradeId ?? 0,
            name: this.selectedGrade?.name ?? '',
          },
          subject: {
            id: this.selectedGradeSubject?.subject.id ?? 0,
            name: this.selectedGradeSubject?.subject.name ?? '',
          },
        },
      },
    };
  }

  private getQuestionTopicId(question: Question): number | null {
    return question.topic?.id ?? (question as any).topicId ?? null;
  }

  private getQuestionLevelId(question: Question): number | null {
    return question.gameLevel?.id ?? (question as any).gameLevelId ?? null;
  }

  private getQuestionGameTypeId(question: Question): number | null {
    return question.gameType?.id ?? (question as any).gameTypeId ?? null;
  }

  private getId(record: unknown, ...keys: string[]): number | undefined {
    if (!this.isRecord(record)) return undefined;
    const values = this.asRecord(record);
    for (const key of keys) {
      const value = values[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
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
