import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';

type StatKey = 'users' | 'subjects' | 'questions' | 'images' | 'audios';

type StatCounts = Record<StatKey, number>;

@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  private readonly destroyRef = inject(DestroyRef);

  users = input.required<number>();
  subjects = input.required<number>();
  questions = input.required<number>();
  images = input.required<number>();
  audios = input.required<number>();

  private readonly displayedCounts = signal<StatCounts>({
    users: 0,
    subjects: 0,
    questions: 0,
    images: 0,
    audios: 0,
  });
  private readonly targetCounts: StatCounts = {
    users: 0,
    subjects: 0,
    questions: 0,
    images: 0,
    audios: 0,
  };
  private readonly animationFrames = new Map<StatKey, number>();

  constructor() {
    effect(() => {
      const counts: StatCounts = {
        users: this.users(),
        subjects: this.subjects(),
        questions: this.questions(),
        images: this.images(),
        audios: this.audios(),
      };

      for (const key of Object.keys(counts) as StatKey[]) {
        if (counts[key] !== this.targetCounts[key]) {
          this.targetCounts[key] = counts[key];
          this.animateCount(key, counts[key]);
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const frame of this.animationFrames.values()) {
        cancelAnimationFrame(frame);
      }
    });
  }

  get stats() {
    const counts = this.displayedCounts();
    return [
      { label: 'Users', value: counts.users.toString() },
      { label: 'Subjects', value: counts.subjects.toString() },
      { label: 'Notifications', value: '0' },
      { label: 'Questions', value: counts.questions.toString() },
      { label: 'Images', value: counts.images.toString() },
      { label: 'Audios', value: counts.audios.toString() },
    ];
  }

  private animateCount(key: StatKey, target: number): void {
    const existingFrame = this.animationFrames.get(key);
    if (existingFrame !== undefined) cancelAnimationFrame(existingFrame);

    if (typeof requestAnimationFrame !== 'function') {
      this.setDisplayedCount(key, target);
      return;
    }

    const duration = 1000;
    let startTime: number | undefined;

    const step = (timestamp: number): void => {
      startTime ??= timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      this.setDisplayedCount(key, Math.round(target * easedProgress));

      if (progress < 1) {
        this.animationFrames.set(key, requestAnimationFrame(step));
      } else {
        this.animationFrames.delete(key);
      }
    };

    this.animationFrames.set(key, requestAnimationFrame(step));
  }

  private setDisplayedCount(key: StatKey, value: number): void {
    this.displayedCounts.update((counts) => ({ ...counts, [key]: value }));
  }
}
