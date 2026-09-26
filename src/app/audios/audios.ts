import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

interface AudioCategory {
  id: number;
  name: string;
}

interface Audio {
  id: number;
  name: string;
  audioCategoryId: number;
  url: string | null;
  audioCategory?: AudioCategory | null;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-audios',
  imports: [CommonModule, FormsModule],
  templateUrl: './audios.html',
  styleUrl: './audios.scss',
})
export class Audios implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  audios: Audio[] = [];
  filteredAudios: Audio[] = [];
  categories: AudioCategory[] = [];
  selectedCategoryId: string = 'all';
  showAddForm = false;
  loading = true;
  categoriesLoading = true;
  error: string | null = null;
  submitting = false;

  newAudio = {
    name: '',
    audioCategoryId: null as number | null,
    file: null as File | null,
  };

  ngOnInit(): void {
    this.loadCategories();
    this.loadAudios();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.dashboardService.getAudioCategories().subscribe({
      next: (response) => {
        this.categories =
          this.normalizeCategories(this.extractList<AudioCategory>(response, 'audioCategories')) ||
          this.normalizeCategories(this.extractList<AudioCategory>(response, 'audio_categories')) ||
          this.normalizeCategories(this.extractList<AudioCategory>(response, 'categories'));
        this.categoriesLoading = false;
        if (this.categories.length === 0) {
          this.error = 'No audio categories were returned by the backend.';
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.categoriesLoading = false;
        this.error = `Failed to load audio categories: ${err.message || 'Unknown error'}`;
        console.error('Error loading audio categories:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadAudios(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getAudios().subscribe({
      next: (response) => {
        this.audios = this.extractList<Audio>(response, 'audios');
        this.filterAudios();
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load audios: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading audios:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  filterAudios(): void {
    if (this.selectedCategoryId === 'all') {
      this.filteredAudios = this.audios;
      return;
    }

    const categoryId = Number(this.selectedCategoryId);
    this.filteredAudios = this.audios.filter((audio) => audio.audioCategoryId === categoryId);
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.filterAudios();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.newAudio.file = input.files[0];
    }
  }

  addAudio(): void {
    const audioCategoryId = this.newAudio.audioCategoryId;

    if (!this.newAudio.name.trim() || !Number.isFinite(audioCategoryId ?? NaN)) {
      this.error = 'Please provide a name and audio category';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (!this.newAudio.file) {
      this.error = 'Please upload an audio file';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.submitting = true;
    this.error = null;

    const formData = new FormData();
    const normalizedName = this.slugify(this.newAudio.name.trim());
    formData.append('name', normalizedName);
    formData.append('audioCategoryId', String(audioCategoryId));

    if (this.newAudio.file) {
      formData.append('audio', this.newAudio.file);
    }

    this.dashboardService.uploadAudio(formData).subscribe({
      next: (response) => {
        const uploaded = this.extractOne<Audio>(response, 'audio') || this.extractOne<Audio>(response, 'data');
        if (uploaded) {
          this.audios.unshift(uploaded);
          this.filterAudios();
        } else {
          this.loadAudios();
        }
        this.submitting = false;
        this.resetForm();
        this.showAddForm = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.submitting = false;
        this.error = this.getAudioErrorMessage(err);
        console.error('Error uploading audio:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  deleteAudio(id: number): void {
    if (!confirm('Are you sure you want to delete this audio?')) return;

    this.dashboardService.deleteAudio(id).subscribe({
      next: () => {
        this.audios = this.audios.filter((audio) => audio.id !== id);
        this.filterAudios();
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to delete audio: ${err.message || 'Unknown error'}`;
        console.error('Error deleting audio:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  resetForm(): void {
    this.newAudio = {
      name: '',
      audioCategoryId: null,
      file: null,
    };
    this.error = null;
  }

  getCategoryName(audio: Audio): string {
    return audio.audioCategory?.name ?? this.categories.find((category) => category.id === audio.audioCategoryId)?.name ?? 'Unknown';
  }

  trackByCategoryId(_: number, category: AudioCategory): number {
    return category.id;
  }

  trackByAudioId(_: number, audio: Audio): number {
    return audio.id;
  }

  getAudioSrc(audio: Audio): string {
    const url = audio.url?.trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.dashboardService.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
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

  private normalizeCategories(categories: AudioCategory[]): AudioCategory[] {
    return categories.map((category) => ({
      ...category,
      id: Number(category.id),
    })).filter((category) => Number.isFinite(category.id));
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'audio';
  }

  private getAudioErrorMessage(err: unknown): string {
    const fallback = 'Failed to upload audio';

    if (!this.isRecord(err)) {
      return fallback;
    }

    const errorBody = this.isRecord(err['error']) ? err['error'] : null;
    const message =
      this.readString(errorBody, 'message') ||
      this.readString(errorBody, 'error') ||
      this.readString(errorBody, 'details') ||
      this.readString(err, 'message') ||
      this.readString(err, 'statusText');

    if (message) {
      return message;
    }

    return fallback;
  }

  private readString(source: ApiRecord | null, key: string): string | null {
    if (!source) return null;
    const value = source[key];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private isRecord(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }
}
