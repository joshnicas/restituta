import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import {
  CreateQuestionPayload,
  GameType,
  Grade,
  GradeSubject,
  GameLevel as Level,
  QuestionMedia,
  Topic,
} from '../../models/educational.models';
import { getInlineQuestionImageError } from '../../questions/inline-question-text';

type Step = 'grade' | 'subject' | 'topic' | 'level' | 'gameType' | 'form';
type MediaAsset = { name: string; url: string };

@Component({
  selector: 'app-add-questions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-questions.html',
  styleUrl: './add-questions.scss',
})
export class AddQuestionComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  step: Step = 'grade';
  grades: Grade[] = [];
  gradeSubjects: GradeSubject[] = [];
  topics: Topic[] = [];
  levels: Level[] = [];
  gameTypes: GameType[] = [];
  images: MediaAsset[] = [];
  audios: MediaAsset[] = [];

  selectedGradeId: number | null = null;
  selectedGradeSubjectId: number | null = null;
  selectedTopicId: number | null = null;
  selectedLevelId: number | null = null;
  selectedGameType: GameType | null = null;
  routeTopicId: number | null = null;
  routeLevelId: number | null = null;

  loading = true;
  loadingSubjects = false;
  loadingTopics = false;
  loadingLevels = false;
  submitting = false;
  successMessage: string | null = null;
  error: string | null = null;
  form: CreateQuestionPayload = this.emptyForm();

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      const topicId = Number(params.get('topicId'));
      const levelId = Number(params.get('levelId'));
      this.routeTopicId = Number.isFinite(topicId) && topicId > 0 ? topicId : null;
      this.routeLevelId = Number.isFinite(levelId) && levelId > 0 ? levelId : null;
    });
    this.loadGrades();
    this.loadMediaAssets();
    if (this.routeLevelId) this.openForLevel(this.routeLevelId);
  }

  get inlineImageError(): string | null {
    return getInlineQuestionImageError(this.form.text, this.form.media);
  }

  get questionTypeLabel(): string {
    return this.selectedGameType?.name || 'Question';
  }

  get selectedGrade(): Grade | null {
    return this.grades.find(grade => Number(grade.id) === this.selectedGradeId) ?? null;
  }

  get selectedGradeSubject(): GradeSubject | null {
    return this.gradeSubjects.find(item => Number(item.id) === this.selectedGradeSubjectId) ?? null;
  }

  get selectedTopic(): Topic | null {
    return this.topics.find(topic => Number(topic.id) === this.selectedTopicId) ?? null;
  }

  get selectedLevel(): Level | null {
    return this.levels.find(level => Number(level.id) === this.selectedLevelId) ?? null;
  }

  selectGrade(grade: Grade): void {
    this.selectedGradeId = Number(grade.id);
    this.selectedGradeSubjectId = null;
    this.selectedTopicId = null;
    this.selectedLevelId = null;
    this.gradeSubjects = [];
    this.topics = [];
    this.levels = [];
    this.error = null;
    this.loadSubjectsForGrade(Number(grade.id));
  }

  selectGradeSubject(gradeSubject: GradeSubject): void {
    this.selectedGradeSubjectId = Number(gradeSubject.id);
    this.selectedTopicId = null;
    this.selectedLevelId = null;
    this.topics = [];
    this.levels = [];
    this.error = null;
    this.loadTopicsAndLevels(Number(gradeSubject.id));
  }

  selectTopic(topic: Topic): void {
    this.selectedTopicId = Number(topic.id);
    if (this.routeLevelId && this.selectedLevelId === this.routeLevelId) {
      this.loadGameTypes();
      return;
    }
    this.step = 'level';
  }

  selectLevel(level: Level): void {
    this.selectedLevelId = Number(level.id);
    this.loadGameTypes();
  }

  selectGameType(gameType: GameType): void {
    this.selectedGameType = gameType;
    this.resetForm();
    this.step = 'form';
  }

  goBack(): void {
    this.error = null;
    if (this.step === 'form') {
      this.step = 'gameType';
      this.selectedGameType = null;
    } else if (this.step === 'gameType') {
      this.step = 'level';
      this.selectedLevelId = null;
    } else if (this.step === 'level') {
      this.step = 'topic';
      this.selectedTopicId = null;
    } else if (this.step === 'topic') {
      this.step = 'subject';
      this.selectedGradeSubjectId = null;
      this.topics = [];
    } else if (this.step === 'subject') {
      this.step = 'grade';
      this.selectedGradeId = null;
      this.gradeSubjects = [];
    }
  }

  cancel(): void {
    this.router.navigate(['/subjects']);
  }

  addOption(): void {
    this.form.options ??= [];
    this.form.options.push({ text: '', image: null, audio: null, isCorrect: false, order: this.form.options.length });
  }

  removeOption(index: number): void {
    this.form.options?.splice(index, 1);
    this.form.options?.forEach((option, order) => option.order = order);
  }

  addMatchingPair(): void {
    this.form.matchingPairs ??= [];
    this.form.matchingPairs.push({ leftText: '', rightText: '', order: this.form.matchingPairs.length });
  }

  removeMatchingPair(index: number): void {
    this.form.matchingPairs?.splice(index, 1);
  }

  addOrderingItem(): void {
    this.form.orderingItems ??= [];
    this.form.orderingItems.push({ text: '', correctOrder: this.form.orderingItems.length });
  }

  removeOrderingItem(index: number): void {
    this.form.orderingItems?.splice(index, 1);
    this.form.orderingItems?.forEach((item, order) => item.correctOrder = order);
  }

  addAcceptedAnswer(): void {
    this.form.acceptedAnswers ??= [];
    this.form.acceptedAnswers.push({ answer: '' });
  }

  removeAcceptedAnswer(index: number): void {
    this.form.acceptedAnswers?.splice(index, 1);
  }

  addSelectedMedia(type: QuestionMedia['type'], url: string): void {
    if (!url || this.form.media?.some(media => media.type === type && media.url === url)) return;
    this.form.media ??= [];
    this.form.media.push({ type, url, altText: null, order: this.form.media.length });
  }

  removeMedia(index: number): void {
    this.form.media?.splice(index, 1);
    this.form.media?.forEach((media, order) => media.order = order);
  }

  mediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `${this.dashboard.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.submitting) return;
    this.submitting = true;
    this.error = null;

    this.successMessage = null;
    const payload: CreateQuestionPayload = {
      ...this.form,
      gameLevelId: this.selectedLevelId!,
      gameTypeId: Number(this.selectedGameType!.id),
      topicId: this.selectedTopicId!,
      text: this.form.text.trim(),
      explanation: this.form.explanation?.trim() || null,
      options: this.form.options?.map((option, order) => ({
        text: option.text?.trim() || '', image: option.image || null, audio: option.audio || null,
        isCorrect: !!option.isCorrect, order,
      })),
      matchingPairs: this.form.matchingPairs?.map(pair => ({ ...pair })),
      orderingItems: this.form.orderingItems?.map((item, correctOrder) => ({ ...item, correctOrder })),
      acceptedAnswers: this.form.acceptedAnswers?.map(answer => ({ ...answer, answer: answer.answer.trim() })).filter(answer => !!answer.answer),
      media: this.form.media?.map((media, order) => ({ ...media, order })),
    };

    this.dashboard.createQuestion(payload).pipe(take(1)).subscribe({
      next: response => {
        this.successMessage = typeof response?.message === 'string' && response.message.trim()
          ? response.message
          : 'Question created successfully.';
        this.submitting = false;
        this.resetForm();
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not create the question.');
        this.submitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  isFormValid(): boolean {
    if (!this.selectedTopicId || !this.selectedLevelId || !this.selectedGameType || !this.form.text.trim()) return false;
    if (this.inlineImageError) return false;
    const code = this.selectedGameType.code;
    if (code === 'MULTIPLE_CHOICE' || code === 'IMAGE_CHOICE') {
      const options = this.form.options ?? [];
      return options.length >= 2 && options.some(option => option.isCorrect) && options.every(option =>
        !!option.text?.trim() || !!option.image || !!option.audio);
    }
    if (code === 'TRUE_FALSE') return typeof this.form.trueFalseAnswer === 'boolean';
    if (code === 'MATCHING' || code === 'DRAG_AND_DROP' || code === 'MEMORY') return (this.form.matchingPairs?.length ?? 0) >= 2
      && this.form.matchingPairs!.every(pair => !!pair.leftText?.trim() && !!pair.rightText?.trim());
    if (code === 'ORDERING') return (this.form.orderingItems?.length ?? 0) >= 2
      && this.form.orderingItems!.every(item => !!item.text?.trim());
    if (code === 'FILL_IN_THE_BLANK') return (this.form.acceptedAnswers?.some(answer => answer.answer.trim())) ?? false;
    return true;
  }

  private emptyForm(): CreateQuestionPayload {
    return {
      gameLevelId: 0, gameTypeId: 0, topicId: 0, text: '', explanation: null, points: 10,
      timeLimit: 30, active: true, options: [], trueFalseAnswer: undefined, matchingPairs: [],
      orderingItems: [], acceptedAnswers: [], media: [], competencyIds: [], themeIds: [],
    };
  }

  private resetForm(): void {
    this.form = this.emptyForm();
    const code = this.selectedGameType?.code;
    if (code === 'MULTIPLE_CHOICE' || code === 'IMAGE_CHOICE') {
      this.addOption(); this.addOption(); this.addOption();
    }
    if (code === 'MATCHING' || code === 'DRAG_AND_DROP' || code === 'MEMORY') {
      this.addMatchingPair(); this.addMatchingPair();
    }
    if (code === 'ORDERING') { this.addOrderingItem(); this.addOrderingItem(); }
    if (code === 'FILL_IN_THE_BLANK') this.addAcceptedAnswer();
  }

  private loadGrades(): void {
    this.loading = true;
    this.dashboard.getGrades().pipe(take(1)).subscribe({
      next: response => {
        this.grades = this.extractList<Grade>(response, 'grades');
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load grades.');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadSubjectsForGrade(gradeId: number): void {
    this.loadingSubjects = true;
    this.dashboard.getSubjectsByGrade(gradeId).pipe(take(1)).subscribe({
      next: response => {
        this.gradeSubjects = this.extractFlexibleList(response, ['gradeSubjects', 'subjects', 'grade_subjects'])
          .map(item => this.mapGradeSubject(item));
        this.loadingSubjects = false;
        this.step = 'subject';
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load subjects.');
        this.loadingSubjects = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadTopicsAndLevels(gradeSubjectId: number, preferredTopicId: number | null = null): void {
    this.loadingTopics = true;
    this.loadingLevels = true;
    this.dashboard.getTopicsByGradeSubject(gradeSubjectId).pipe(take(1)).subscribe({
      next: response => {
        this.topics = this.extractList<Topic>(response, 'topics');
        this.loadingTopics = false;
        const requestedTopic = this.topics.find(topic => Number(topic.id) === preferredTopicId);
        if (requestedTopic) {
          this.selectedTopicId = Number(requestedTopic.id);
          this.step = 'level';
        } else {
          this.step = 'topic';
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load topics.');
        this.loadingTopics = false;
        this.cdr.markForCheck();
      },
    });
    this.dashboard.getLevelsByGradeSubject(gradeSubjectId).pipe(take(1)).subscribe({
      next: response => {
        this.levels = this.extractList<Level>(response, 'levels');
        this.loadingLevels = false;
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load levels.');
        this.loadingLevels = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadGameTypes(): void {
    this.dashboard.getGameTypes().pipe(take(1)).subscribe({
      next: response => {
        this.gameTypes = this.extractList<GameType>(response, 'gameTypes');
        this.step = 'gameType';
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load question types.');
        this.cdr.markForCheck();
      },
    });
  }

  private loadMediaAssets(): void {
    this.dashboard.getImages().pipe(take(1)).subscribe({
      next: response => {
        this.images = this.extractList<any>(response, 'images').map(item => this.mapAsset(item)).filter(Boolean) as MediaAsset[];
        this.cdr.markForCheck();
      },
      error: () => {
        this.error ??= 'Could not load uploaded images.';
        this.cdr.markForCheck();
      },
    });
    this.dashboard.getAudios().pipe(take(1)).subscribe({
      next: response => {
        this.audios = this.extractList<any>(response, 'audios').map(item => this.mapAsset(item)).filter(Boolean) as MediaAsset[];
        this.cdr.markForCheck();
      },
      error: () => {
        this.error ??= 'Could not load uploaded audio.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Opens the same wizard from a level's Question page without losing its context. */
  private openForLevel(levelId: number): void {
    this.loading = true;
    this.dashboard.getLevel(levelId).pipe(take(1)).subscribe({
      next: response => {
        const level = (response?.level ?? response?.data?.level ?? response?.data ?? response) as Level;
        const gradeSubjectId = Number(level?.gradeSubjectId);
        if (!Number.isInteger(gradeSubjectId) || gradeSubjectId <= 0) {
          this.error = 'The selected level has no grade and subject context.';
          this.loading = false;
          return;
        }

        this.selectedLevelId = Number(level.id);
        this.selectedGradeSubjectId = gradeSubjectId;
        this.dashboard.getGradeSubject(gradeSubjectId).pipe(take(1)).subscribe({
          next: gradeSubjectResponse => {
            const gradeSubject = this.mapGradeSubject(
              gradeSubjectResponse?.gradeSubject ?? gradeSubjectResponse?.data?.gradeSubject ?? gradeSubjectResponse?.data ?? gradeSubjectResponse,
            );
            this.selectedGradeId = Number(gradeSubject.gradeId);
            this.gradeSubjects = [gradeSubject];
            this.levels = [level];
            this.loading = false;
            this.loadTopicsAndLevels(gradeSubjectId, this.routeTopicId);
          },
          error: error => {
            this.error = this.getErrorMessage(error, 'Could not load the selected level context.');
            this.loading = false;
          },
        });
      },
      error: error => {
        this.error = this.getErrorMessage(error, 'Could not load the selected level.');
        this.loading = false;
      },
    });
  }

  private extractList<T>(response: any, key: string): T[] {
    if (Array.isArray(response)) return response;
    const data = response?.data ?? response;
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }

  private extractFlexibleList(response: any, keys: string[]): any[] {
    if (Array.isArray(response)) return response;
    const data = response?.data ?? response;
    for (const key of keys) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  private mapGradeSubject(item: any): GradeSubject {
    const subject = item?.subject ?? item;
    return { ...item, id: Number(item?.id ?? item?.gradeSubjectId ?? subject?.id), subjectId: Number(item?.subjectId ?? subject?.id), gradeId: Number(item?.gradeId ?? this.selectedGradeId), subject } as GradeSubject;
  }

  private mapAsset(item: any): MediaAsset | null {
    const url = typeof item === 'string' ? item : item?.url ?? item?.path;
    if (!url || typeof url !== 'string') return null;
    return { url, name: item?.name ?? item?.filename ?? url.split('/').pop() ?? url };
  }

  private getErrorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.message || fallback;
  }
}
