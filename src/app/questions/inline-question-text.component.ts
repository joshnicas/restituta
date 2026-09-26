import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { QuestionMedia } from '../models/educational.models';
import { DashboardService } from '../services/dashboard.service';
import {
  getInlineQuestionImageError,
  InlineQuestionPart,
  parseInlineQuestionText,
} from './inline-question-text';

@Component({
  selector: 'app-inline-question-text',
  imports: [CommonModule],
  template: `
    <span *ngIf="!error" class="inline-question-text">
      <ng-container *ngFor="let part of parts">
        <ng-container *ngIf="isImagePart(part); else textPart">
          <img
            *ngIf="part.url && !failedImages.has(part.token); else imageFallback"
            class="inline-question-image"
            [src]="resolveUrl(part.url)"
            [alt]="part.token"
            (error)="markImageAsFailed(part.token)"
          />
          <ng-template #imageFallback><span class="inline-question-image-fallback">{{ part.token }}</span></ng-template>
        </ng-container>
        <ng-template #textPart>{{ getTextPartValue(part) }}</ng-template>
      </ng-container>
      <img
        *ngIf="!hasInlineImage && fallbackImage"
        class="inline-question-image"
        [src]="resolveUrl(fallbackImage)"
        alt="Question image"
      />
    </span>
    <span *ngIf="error" class="inline-question-error" role="alert">{{ error }}</span>
  `,
  styles: [`
    .inline-question-text { white-space: pre-wrap; }
    .inline-question-image { max-width: 5rem; max-height: 5rem; margin: 0 0.25rem; vertical-align: middle; object-fit: contain; }
    .inline-question-image-fallback { font-weight: 600; }
    .inline-question-error { display: block; color: #b42318; font-size: 0.875rem; margin-top: 0.25rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineQuestionTextComponent implements OnChanges {
  private readonly dashboardService = inject(DashboardService);
  @Input() text = '';
  @Input() media: QuestionMedia[] | undefined;
  @Input() fallbackImage: string | null | undefined;

  parts: InlineQuestionPart[] = [];
  error: string | null = null;
  failedImages = new Set<string>();

  get hasInlineImage(): boolean {
    return this.parts.some((part) => part.type === 'image');
  }

  isImagePart(part: InlineQuestionPart): part is Extract<InlineQuestionPart, { type: 'image' }> {
    return part.type === 'image';
  }

  getTextPartValue(part: InlineQuestionPart): string {
    return part.type === 'text' ? part.value : '';
  }

  ngOnChanges(): void {
    this.parts = parseInlineQuestionText(this.text, this.media, this.fallbackImage);
    this.error = getInlineQuestionImageError(this.text, this.media, this.fallbackImage);
    this.failedImages.clear();
  }

  markImageAsFailed(token: string): void {
    this.failedImages.add(token);
  }

  resolveUrl(url: string | null | undefined): string {
    if (!url) return '';
    return /^https?:\/\//i.test(url)
      ? url
      : `${this.dashboardService.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
