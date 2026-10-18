import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { MediaUrlService } from '../services/media-url.service';

interface Song { id: number; title: string; subtitle: string | null; mediaType: 'AUDIO' | 'VIDEO'; url: string; duration: string | null; sortOrder: number; active: boolean }
type Draft = { title: string; subtitle: string; duration: string; sortOrder: number; active: boolean; file: File | null };

@Component({
  selector: 'app-songs', imports: [CommonModule, FormsModule], templateUrl: './songs.html', styleUrl: './songs.scss',
})
export class Songs implements OnInit {
  private readonly pageSize = 10;
  private readonly api = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly mediaUrlService = inject(MediaUrlService);
  songs: Song[] = [];
  searchQuery = '';
  currentPage = 1;
  loading = true;
  saving = false;
  error = '';
  showForm = false;
  editingId: number | null = null;
  draft: Draft = this.emptyDraft();

  get filteredSongs(): Song[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    return query ? this.songs.filter((song) => song.title.toLocaleLowerCase().includes(query)) : this.songs;
  }

  get pagedSongs(): Song[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSongs.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.ceil(this.filteredSongs.length / this.pageSize); }

  get pageStart(): number { return this.filteredSongs.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }

  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.filteredSongs.length); }

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.api.getSongs(true).subscribe({
      next: (response) => { this.songs = Array.isArray(response?.songs) ? response.songs : []; this.currentPage = 1; this.loading = false; this.cdr.markForCheck(); },
      error: (error) => { this.error = error?.error?.message || 'Could not load songs.'; this.loading = false; this.cdr.markForCheck(); },
    });
  }
  onSearchChange(): void { this.currentPage = 1; }
  previousPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      this.error = 'Choose an audio or video file.'; input.value = ''; return;
    }
    if (file && file.size > 250 * 1024 * 1024) {
      this.error = 'Media files must be 250 MB or smaller.'; input.value = ''; return;
    }
    this.error = '';
    this.draft.file = file;
  }
  newSong(): void { this.editingId = null; this.draft = this.emptyDraft(); this.showForm = true; this.error = ''; }
  edit(song: Song): void { this.editingId = song.id; this.draft = { title: song.title, subtitle: song.subtitle ?? '', duration: song.duration ?? '', sortOrder: song.sortOrder, active: song.active, file: null }; this.showForm = true; this.error = ''; }
  cancel(): void { this.showForm = false; this.editingId = null; this.draft = this.emptyDraft(); }
  save(): void {
    if (!this.draft.title.trim() || (this.editingId === null && !this.draft.file) || this.saving) { this.error = 'Enter a title and choose an audio or video file.'; return; }
    const body = new FormData();
    body.append('title', this.draft.title.trim()); body.append('subtitle', this.draft.subtitle.trim());
    body.append('duration', this.draft.duration.trim()); body.append('sortOrder', String(this.draft.sortOrder)); body.append('active', String(this.draft.active));
    if (this.draft.file) body.append('media', this.draft.file);
    this.saving = true; this.error = '';
    const req = this.editingId === null ? this.api.createSong(body) : this.api.updateSong(this.editingId, body);
    req.subscribe({
      next: () => { this.saving = false; this.cancel(); this.load(); },
      error: (error) => { this.saving = false; this.error = error?.error?.message || 'Could not save song.'; this.cdr.markForCheck(); },
    });
  }
  toggleActive(song: Song): void {
    const body = new FormData(); body.append('active', String(!song.active));
    this.api.updateSong(song.id, body).subscribe({ next: () => { song.active = !song.active; this.cdr.markForCheck(); }, error: (error) => { this.error = error?.error?.message || 'Could not update song.'; this.cdr.markForCheck(); } });
  }
  remove(song: Song): void {
    if (!confirm(`Delete “${song.title}”?`)) return;
    this.api.deleteSong(song.id).subscribe({ next: () => { this.songs = this.songs.filter((item) => item.id !== song.id); if (this.currentPage > this.totalPages) this.currentPage = Math.max(1, this.totalPages); this.cdr.markForCheck(); }, error: (error) => { this.error = error?.error?.message || 'Could not delete song.'; this.cdr.markForCheck(); } });
  }
  mediaUrl(song: Song): string { return this.mediaUrlService.resolve(song.url); }
  onPreviewError(event: Event): void {
    const media = event.target as HTMLMediaElement;
    media.hidden = true;
    const fallback = document.createElement('p');
    fallback.className = 'state';
    fallback.textContent = 'Media preview unavailable.';
    media.parentElement?.append(fallback);
  }
  private emptyDraft(): Draft { return { title: '', subtitle: '', duration: '', sortOrder: 0, active: true, file: null }; }
}
