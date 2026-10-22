import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { Question } from '../../models/educational.models';

type Lang = 'EN' | 'SW';
type RecordValue = any;

@Component({
  selector: 'app-level-question-full-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './level-question-full-editor.html',
  styleUrl: './level-question-full-editor.scss',
})
export class LevelQuestionFullEditor implements OnChanges {
  @Input({ required: true }) questionId!: number;
  @Input({ required: true }) levelId!: number;
  @Input() initialQuestions: Question[] = [];
  @Input() questionListLoading = false;
  @Input() questionListError: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Input() questionIds: number[] = [];
  @Output() saved = new EventEmitter<number>();

  private readonly dashboard = inject(DashboardService);
  private loadToken = 0;
  private assetsLoaded = false;
  private assetsLoading = false;
  private readonly englishQuestionCache = new Map<number, RecordValue>();
  private readonly swahiliQuestionCache = new Map<number, RecordValue>();
  draft: RecordValue | null = null;
  images: Array<{ name: string; url: string }> = [];
  audios: Array<{ name: string; url: string }> = [];
  language: Lang = 'EN';
  loading = true;
  swahiliLoading = true;
  swahiliLoadFailed = false;
  imagePage = 1;
  loadingMoreImages = false;
  hasMoreImages = false;
  saving = false;
  saveSuccess = false;
  error = '';
  readonly pendingUpdates = new Map<number, RecordValue>();
  get queuedQuestionCount(): number { return this.pendingUpdates.size; }
  get savedQuestionCount(): number { return this.batchResult.filter(result => result.success).length; }
  get failedQuestionCount(): number { return this.batchResult.filter(result => !result.success).length; }
  batchSaving = false;
  batchResult: Array<{ id: number; success: boolean; error?: string }> = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId'] && this.questionId) this.load();
    else if (changes['initialQuestions'] && this.loading && this.questionId) this.load();
  }

  close(): void { this.closed.emit(); }
  get currentQuestionNumber(): number { return Math.max(1, this.questionIds.indexOf(this.questionId) + 1); }
  goToQuestion(delta: number): void {
    const nextIndex = this.questionIds.indexOf(this.questionId) + delta;
    if (nextIndex < 0 || nextIndex >= this.questionIds.length) return;
    this.cacheCurrentDraft();
    this.questionId = this.questionIds[nextIndex];
    this.saveSuccess = false;
    this.load();
  }

  addOption(): void { this.draft?.options.push({ id: undefined, isCorrect: false, order: this.draft.options.length, audio: null, images: [], translations: { EN: { text: '' }, SW: { text: '' } } }); }
  removeOption(index: number): void { this.draft?.options.splice(index, 1); }
  addMedia(type: 'IMAGE' | 'AUDIO'): void { this.draft?.media.push({ type, url: '', altText: '', order: this.draft.media.length }); }
  removeMedia(index: number): void { this.draft?.media.splice(index, 1); }
  addPair(): void { this.draft?.matchingPairs.push({ leftText: '', rightText: '', leftImage: null, rightImage: null, order: this.draft.matchingPairs.length, translations: { EN: { leftText: '', rightText: '' }, SW: { leftText: '', rightText: '' } } }); }
  removePair(index: number): void { this.draft?.matchingPairs.splice(index, 1); }
  addOrderingItem(): void { this.draft?.orderingItems.push({ text: '', image: null, correctOrder: this.draft.orderingItems.length, translations: { EN: { text: '' }, SW: { text: '' } } }); }
  removeOrderingItem(index: number): void { this.draft?.orderingItems.splice(index, 1); }
  addAcceptedAnswer(): void { this.draft?.acceptedAnswers.push({ answer: '', language: this.language, isCaseSensitive: false }); }
  removeAcceptedAnswer(index: number): void { this.draft?.acceptedAnswers.splice(index, 1); }
  loadMoreImages(): void {
    if (this.loadingMoreImages || !this.hasMoreImages) return;
    this.loadingMoreImages = true;
    const nextPage = this.imagePage + 1;
    this.dashboard.getImages({ page: nextPage, limit: 60 }).pipe(take(1), catchError(() => of([]))).subscribe((response) => {
      const nextImages = this.list(response, 'images').map((asset) => this.asset(asset)).filter((item): item is { name: string; url: string } => !!item);
      this.images = [...this.images, ...nextImages];
      this.imagePage = nextPage;
      this.hasMoreImages = nextImages.length === 60;
      this.loadingMoreImages = false;
    });
  }
  mediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `${this.dashboard.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  save(): void {
    if (!this.draft || this.batchSaving || this.swahiliLoading || this.swahiliLoadFailed) return;
    const questionId = this.questionId;
    const gameTypeId = this.draft.gameTypeId;
    const gameTypeCode = this.draft.typeCode;
    this.saveSuccess = false;
    this.error = '';
    const text = (value: unknown) => String(value ?? '').trim();
    const translations = {
      EN: { text: text(this.draft.translations.EN.text) },
      SW: { text: text(this.draft.translations.SW.text) },
    };
    const payload: RecordValue = {
      gameLevelId: Number(this.draft.gameLevelId || this.levelId),
      gameTypeId: Number(this.draft.gameTypeId),
      topicId: this.draft.topicId === '' || this.draft.topicId === null ? null : Number(this.draft.topicId),
      text: translations.EN.text,
      points: Math.max(0, Math.trunc(Number(this.draft.points) || 0)),
      timeLimit: this.draft.timeLimit === '' || this.draft.timeLimit === null ? null : Math.max(1, Math.trunc(Number(this.draft.timeLimit) || 1)),
      active: this.draft.active === true,
      translations,
      media: this.draft.media.filter((item: RecordValue) => item.url).map((item: RecordValue, order: number) => ({ ...item, type: item.type, url: item.url, altText: text(item.altText) || null, order })),
    };
    const code = String(this.draft.typeCode ?? '').toUpperCase();
    if (code === 'TRUE_FALSE') payload.trueFalseAnswer = this.draft.trueFalseAnswer;
    if (['MULTIPLE_CHOICE', 'IMAGE_CHOICE'].includes(code)) {
      payload.options = this.draft.options.map((option: RecordValue, order: number) => ({
        ...(option.id !== undefined ? { id: option.id } : {}),
        text: text(option.translations?.EN?.text),
        image: option.images?.[0]?.url ?? option.image ?? null,
        images: (option.images ?? []).map((image: RecordValue, imageOrder: number) => ({ url: image.url, count: Math.max(1, Math.min(100, Math.trunc(Number(image.count) || 1))), order: imageOrder })),
        audio: option.audio || null,
        isCorrect: option.isCorrect === true,
        order,
        translations: { EN: { text: text(option.translations?.EN?.text) }, SW: { text: text(option.translations?.SW?.text) } },
      }));
    }
    if (['MATCHING', 'DRAG_AND_DROP', 'MEMORY'].includes(code)) {
      payload.matchingPairs = this.draft.matchingPairs.map((pair: RecordValue, order: number) => ({
        ...(pair.id !== undefined ? { id: pair.id } : {}),
        leftText: text(pair.translations?.EN?.leftText) || null,
        rightText: text(pair.translations?.EN?.rightText) || null,
        leftImage: pair.leftImage ?? null,
        rightImage: pair.rightImage ?? null,
        order,
        translations: {
          EN: { leftText: text(pair.translations?.EN?.leftText) || null, rightText: text(pair.translations?.EN?.rightText) || null },
          SW: { leftText: text(pair.translations?.SW?.leftText) || null, rightText: text(pair.translations?.SW?.rightText) || null },
        },
      }));
    }
    if (['ORDERING', 'DRAG_AND_DROP'].includes(code)) {
      payload.orderingItems = this.draft.orderingItems.map((item: RecordValue, order: number) => ({
        ...(item.id !== undefined ? { id: item.id } : {}),
        text: text(item.translations?.EN?.text) || null,
        image: item.image ?? null,
        correctOrder: order,
        translations: { EN: { text: text(item.translations?.EN?.text) || null }, SW: { text: text(item.translations?.SW?.text) || null } },
      }));
    }
    if (code === 'FILL_IN_THE_BLANK') {
      payload.acceptedAnswers = this.draft.acceptedAnswers
        .filter((answer: RecordValue) => text(answer.answer))
        .map((answer: RecordValue) => ({ ...(answer.id !== undefined ? { id: answer.id } : {}), answer: text(answer.answer), language: answer.language, isCaseSensitive: answer.isCaseSensitive === true }));
    }
    this.pendingUpdates.set(questionId, { ...payload, gameTypeId, gameTypeCode });
    this.saveSuccess = true;
    this.error = '';
  }

  saveAll(): void {
    this.cacheCurrentDraft();
    if (!this.pendingUpdates.size || this.batchSaving) return;
    const updates = [...this.pendingUpdates.entries()].map(([id, data]) => ({ id, data }));
    this.batchSaving = true;
    this.batchResult = [];
    this.dashboard.updateQuestionsBatch(updates).pipe(take(1)).subscribe({
      next: response => {
        const results = Array.isArray(response?.results) ? response.results : [];
        this.batchResult = results;
        results.forEach((result: RecordValue) => {
          if (!result.success) return;
          const pending = this.pendingUpdates.get(Number(result.id));
          if (!pending) return;
          this.englishQuestionCache.set(Number(result.id), { ...pending, gameType: { id: pending.gameTypeId, code: pending.gameTypeCode } });
          this.swahiliQuestionCache.delete(Number(result.id));
          this.pendingUpdates.delete(Number(result.id));
          this.saved.emit(Number(result.id));
        });
        this.batchSaving = false;
      },
      error: failure => { this.error = failure?.error?.message || 'Could not save the questions. Please retry.'; this.batchSaving = false; },
    });
  }

  private cacheCurrentDraft(): void {
    if (!this.draft) return;
    const existing = this.pendingUpdates.get(this.questionId);
    if (!existing) return;
    const updated = { ...existing, translations: { EN: { text: String(this.draft.translations.EN.text ?? '').trim() }, SW: { text: String(this.draft.translations.SW.text ?? '').trim() } }, text: String(this.draft.translations.EN.text ?? '').trim(), active: this.draft.active, media: this.draft.media.filter((item: RecordValue) => item.url).map((item: RecordValue, order: number) => ({ ...item, order })) };
    const code = String(this.draft.typeCode ?? '').toUpperCase();
    if (code === 'TRUE_FALSE') updated.trueFalseAnswer = this.draft.trueFalseAnswer;
    if (['MULTIPLE_CHOICE', 'IMAGE_CHOICE'].includes(code)) updated.options = this.draft.options.map((option: RecordValue, order: number) => ({ ...option, text: String(option.translations?.EN?.text ?? '').trim(), order, translations: { EN: { text: String(option.translations?.EN?.text ?? '').trim() }, SW: { text: String(option.translations?.SW?.text ?? '').trim() } } }));
    if (['MATCHING', 'DRAG_AND_DROP', 'MEMORY'].includes(code)) updated.matchingPairs = this.draft.matchingPairs.map((pair: RecordValue, order: number) => ({ ...pair, leftText: pair.translations?.EN?.leftText ?? null, rightText: pair.translations?.EN?.rightText ?? null, order, translations: pair.translations }));
    if (['ORDERING', 'DRAG_AND_DROP'].includes(code)) updated.orderingItems = this.draft.orderingItems.map((item: RecordValue, order: number) => ({ ...item, text: item.translations?.EN?.text ?? null, correctOrder: order, translations: item.translations }));
    if (code === 'FILL_IN_THE_BLANK') updated.acceptedAnswers = this.draft.acceptedAnswers;
    this.pendingUpdates.set(this.questionId, updated);
  }

  private load(): void {
    const token = ++this.loadToken;
    this.loading = true;
    this.swahiliLoading = true;
    this.swahiliLoadFailed = false;
    this.error = '';
    this.draft = null;
    const cachedQuestion = this.englishQuestionCache.get(this.questionId);
    if (cachedQuestion) {
      this.draft = this.createDraft(cachedQuestion);
      this.loading = false;
      this.loadSwahili(token);
      this.loadAssets();
      return;
    }
    const initialQuestion = this.initialQuestions.find((question) => question.id === this.questionId);
    if (initialQuestion) {
      const question = initialQuestion as Question & RecordValue;
      const english = { ...question, gameTypeId: question.gameType?.id, topicId: question.topic?.id };
      this.englishQuestionCache.set(this.questionId, english);
      this.draft = this.createDraft(english);
      this.loading = false;
      this.loadSwahili(token);
      this.loadAssets();
      return;
    }
    this.dashboard.getQuestion(this.questionId, 'EN').pipe(take(1)).subscribe({
      next: (en) => {
        if (token !== this.loadToken) return;
        const english = this.unwrap(en);
        this.englishQuestionCache.set(this.questionId, english);
        this.draft = this.createDraft(english);
        this.loading = false;
        this.loadSwahili(token);
        this.loadAssets();
      },
      error: (failure) => { if (token !== this.loadToken) return; this.error = failure?.error?.message || 'Could not load this question.'; this.loading = false; },
    });
  }

  private createDraft(english: RecordValue): RecordValue {
    return {
      gameLevelId: Number(english['gameLevelId'] ?? english['gameLevel']?.['id'] ?? this.levelId),
      gameTypeId: Number(english['gameTypeId'] ?? english['gameType']?.['id'] ?? 0),
      topicId: english['topicId'] ?? english['topic']?.['id'] ?? null,
      topicList: [], points: english['points'] ?? 0, timeLimit: english['timeLimit'] ?? null,
      active: english['active'] !== false, typeCode: english['gameType']?.['code'] ?? '',
      translations: { EN: { text: english['text'] ?? '' }, SW: { text: '' } },
      trueFalseAnswer: english['trueFalseAnswer'] ?? null,
      media: Array.isArray(english['media']) ? english['media'].map((item: RecordValue) => ({ ...item })) : [],
      options: (Array.isArray(english['options']) ? english['options'] : []).map((item: RecordValue) => ({
        ...item,
        images: item['images'] ?? (item['image'] ? [{ url: item['image'], count: 1 }] : []),
        translations: { EN: { text: item['text'] ?? '' }, SW: { text: '' } },
      })),
      matchingPairs: Array.isArray(english['matchingPairs']) ? english['matchingPairs'].map((item: RecordValue) => ({
        ...item,
        translations: { EN: { leftText: item['leftText'] ?? '', rightText: item['rightText'] ?? '' }, SW: { leftText: '', rightText: '' } },
      })) : [],
      orderingItems: Array.isArray(english['orderingItems']) ? english['orderingItems'].map((item: RecordValue) => ({
        ...item,
        translations: { EN: { text: item['text'] ?? '' }, SW: { text: '' } },
      })) : [],
      acceptedAnswers: Array.isArray(english['acceptedAnswers']) ? english['acceptedAnswers'].map((item: RecordValue) => ({ ...item, language: item['language'] ?? 'EN' })) : [],
    };
  }

  private loadSwahili(token: number): void {
    const cached = this.swahiliQuestionCache.get(this.questionId);
    if (cached) {
      this.applySwahili(cached);
      this.swahiliLoading = false;
      return;
    }
    this.dashboard.getQuestion(this.questionId, 'SW').pipe(take(1)).subscribe({
      next: (response) => {
        if (token !== this.loadToken) return;
        const swahili = this.unwrap(response);
        this.swahiliQuestionCache.set(this.questionId, swahili);
        this.applySwahili(swahili);
        this.swahiliLoading = false;
      },
      error: () => { if (token !== this.loadToken) return; this.swahiliLoading = false; this.swahiliLoadFailed = true; this.error = 'Could not load Kiswahili fields. Close and retry before saving to protect the existing translation.'; },
    });
  }

  private applySwahili(swahili: RecordValue): void {
        const exists = swahili['translationStatus']?.['SW'] === true;
        if (this.draft && exists) {
          this.draft.translations.SW.text = swahili['text'] ?? '';
          this.draft.options.forEach((item: RecordValue) => {
            const localized = (Array.isArray(swahili['options']) ? swahili['options'] : []).find((candidate: RecordValue) => String(candidate['id']) === String(item['id']));
            item.translations.SW.text = localized?.['text'] ?? '';
          });
          this.draft.matchingPairs.forEach((item: RecordValue) => {
            const localized = (Array.isArray(swahili['matchingPairs']) ? swahili['matchingPairs'] : []).find((candidate: RecordValue) => String(candidate['id']) === String(item['id']));
            item.translations.SW = { leftText: localized?.['leftText'] ?? '', rightText: localized?.['rightText'] ?? '' };
          });
          this.draft.orderingItems.forEach((item: RecordValue) => {
            const localized = (Array.isArray(swahili['orderingItems']) ? swahili['orderingItems'] : []).find((candidate: RecordValue) => String(candidate['id']) === String(item['id']));
            item.translations.SW.text = localized?.['text'] ?? '';
          });
          const swAnswers = Array.isArray(swahili['acceptedAnswers']) ? swahili['acceptedAnswers'].filter((item: RecordValue) => item['language'] === 'SW') : [];
          this.draft.acceptedAnswers = [...this.draft.acceptedAnswers.filter((item: RecordValue) => item.language !== 'SW'), ...swAnswers.map((item: RecordValue) => ({ ...item, language: 'SW' }))];
        }
  }

  private loadAssets(): void {
    if (this.assetsLoaded || this.assetsLoading) return;
    this.assetsLoading = true;
    forkJoin({
      images: this.dashboard.getImages({ page: 1, limit: 60 }).pipe(catchError(() => of([]))),
      audios: this.dashboard.getAudios().pipe(catchError(() => of([]))),
      topics: this.dashboard.getTopics().pipe(catchError(() => of([]))),
    }).pipe(take(1)).subscribe(({ images, audios, topics }) => {
      const assets = this.list(images, 'images').map((item) => this.asset(item)).filter((item): item is { name: string; url: string } => !!item);
      this.images = assets;
      this.imagePage = 1;
      this.hasMoreImages = assets.length === 60;
      this.audios = this.list(audios, 'audios').map((item) => this.asset(item)).filter((item): item is { name: string; url: string } => !!item);
      if (this.draft) this.draft.topicList = this.list(topics, 'topics');
      this.assetsLoaded = true;
      this.assetsLoading = false;
    });
  }

  private unwrap(response: unknown): RecordValue {
    let current = response as RecordValue;
    for (let i = 0; i < 3 && current && typeof current === 'object'; i++) current = current['question'] ?? current['data'] ?? current;
    return current && typeof current === 'object' ? current : {};
  }
  private list(response: unknown, key: string): RecordValue[] {
    if (Array.isArray(response)) return response;
    const record = response as RecordValue;
    const data = record?.['data'];
    return Array.isArray(record?.[key]) ? record[key] : Array.isArray(data?.[key]) ? data[key] : Array.isArray(data) ? data : [];
  }
  private asset(value: unknown): { name: string; url: string } | null {
    if (typeof value === 'string') return { name: value.split('/').pop() ?? value, url: value };
    const record = value as RecordValue;
    const url = record?.['url'] ?? record?.['path'];
    return typeof url === 'string' ? { name: record['name'] ?? record['filename'] ?? url.split('/').pop() ?? url, url } : null;
  }
}
