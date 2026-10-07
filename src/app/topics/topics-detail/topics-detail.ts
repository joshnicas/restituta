import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { I18nService } from '../../services/i18n.service';

interface Topic {
  id: number;
  subjectId: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-topics-detail',
  imports: [CommonModule],
  templateUrl: './topics-detail.html',
  styleUrl: './topics-detail.scss',
})
export class TopicsDetail implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  gradeId: number | null = null;
  subjectId: number | null = null;
  gradeSubjectId: number | null = null;
  topics: Topic[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.gradeId = this.readPositiveQueryId('gradeId');
    this.subjectId = this.readPositiveQueryId('subjectId');
    this.gradeSubjectId = this.readPositiveQueryId('gradeSubjectId');

    if (this.gradeSubjectId) {
      this.loadTopics();
    } else if (this.gradeId && this.subjectId) {
      this.loadGradeSubjectId();
    } else {
      this.error = 'Missing grade or subject ID';
      this.loading = false;
    }
  }

  /** Resolve the gradeSubjectId by calling the subjects-by-grade endpoint, mirroring levels-detail logic. */
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
            this.loadTopics();
          } else {
            this.loadTopicsFallback();
          }
        } else {
          this.loadTopicsFallback();
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

  /** Primary load: fetch topics belonging to this grade+subject via the gradeSubjectId endpoint. */
  loadTopics(): void {
    this.dashboardService.getTopicsByGradeSubject(this.gradeSubjectId!).subscribe({
      next: (response) => {
        this.topics = this.mapTopics(this.extractList<ApiRecord>(response, 'topics'));
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load topics: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading topics:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  /** Fallback: fetch all topics and filter by subjectId client-side. */
  loadTopicsFallback(): void {
    this.dashboardService.getTopics().subscribe({
      next: (response) => {
        const all = this.extractList<ApiRecord>(response, 'topics');
        const filtered = all.filter((t) => this.getId(t, 'subjectId') === this.subjectId);
        this.topics = this.mapTopics(filtered);
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load topics: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading topics:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/topics']);
  }

  addTopic(): void {
    if (!this.subjectId) {
      alert('Subject ID is required to create a topic');
      return;
    }

    const name = prompt('Enter topic name:');
    if (!name || !name.trim()) return;

    const code = prompt('Enter topic code (e.g., MULTIPLICATION):');
    if (!code || !code.trim()) return;

    const descriptionRaw = prompt('Enter topic description (optional):');
    // null means user cancelled — treat same as skipped; empty string → undefined
    const description = descriptionRaw === null ? undefined : (descriptionRaw.trim() || undefined);

    const payload: {
      subjectId: number;
      name: string;
      code: string;
      description?: string;
      active: boolean;
      gradeSubjectIds?: number[];
    } = {
      subjectId: this.subjectId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description,
      active: true,
    };

    // Link the new topic to the current grade-subject so it shows up immediately
    if (this.gradeSubjectId) {
      payload.gradeSubjectIds = [this.gradeSubjectId];
    }

    this.dashboardService.createTopic(payload).subscribe({
      next: () => {
        this.reloadTopics();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to create topic: ${msg}`);
      },
    });
  }

  editTopic(topicId: number): void {
    const topic = this.topics.find((t) => t.id === topicId);
    if (!topic) return;

    const name = prompt('Enter topic name:', topic.name);
    if (name === null) return;

    const code = prompt('Enter topic code:', topic.code);
    if (code === null) return;

    const description = prompt('Enter topic description:', topic.description ?? '');
    if (description === null) return;

    const active = confirm('Is this topic active?');

    const payload: Record<string, unknown> = {};
    if (name !== topic.name) payload['name'] = name;
    if (code !== topic.code) payload['code'] = code.toUpperCase();
    if (description !== (topic.description ?? '')) payload['description'] = description || undefined;
    if (active !== topic.active) payload['active'] = active;

    if (Object.keys(payload).length === 0) return;

    this.dashboardService.updateTopic(topicId, payload as any).subscribe({
      next: () => {
        this.reloadTopics();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to update topic: ${msg}`);
      },
    });
  }

  deleteTopic(topicId: number): void {
    const topic = this.topics.find((t) => t.id === topicId);
    if (!topic) return;

    if (!confirm(`Are you sure you want to delete "${topic.name}"?`)) return;

    this.dashboardService.deleteTopic(topicId).subscribe({
      next: () => {
        this.reloadTopics();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Unknown error';
        alert(`Failed to delete topic: ${msg}`);
      },
    });
  }

  /** Re-run the appropriate load based on what IDs are available. */
  private reloadTopics(): void {
    if (this.gradeSubjectId) {
      this.loadTopics();
    } else {
      this.loadTopicsFallback();
    }
  }

  private mapTopics(topics: ApiRecord[]): Topic[] {
    return topics
      .map((topic) => ({
        id: this.getId(topic, 'id') ?? 0,
        subjectId: this.getId(topic, 'subjectId') ?? 0,
        name: typeof topic['name'] === 'string' ? topic['name'] : 'Topic',
        code: typeof topic['code'] === 'string' ? topic['code'] : '',
        description: typeof topic['description'] === 'string' ? topic['description'] : undefined,
        active: typeof topic['active'] === 'boolean' ? topic['active'] : true,
      }))
      .filter((topic) => topic.id > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
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

  private readPositiveQueryId(key: string): number | null {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  private asRecord(value: object): ApiRecord {
    return value as unknown as ApiRecord;
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }
}
