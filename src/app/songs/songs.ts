import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

interface Song { id: number; title: string; subtitle: string | null; mediaType: 'AUDIO' | 'VIDEO'; url: string; duration: string | null; sortOrder: number; active: boolean }
type Draft = { title: string; subtitle: string; duration: string; sortOrder: number; active: boolean; file: File | null };

@Component({
  selector: 'app-songs', imports: [CommonModule, FormsModule], templateUrl: './songs.html', styleUrl: './songs.scss',
})
export class Songs implements OnInit {
  private readonly api = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  songs: Song[] = [];
  loading = true;
  saving = false;
  error = '';
  showForm = false;
  editingId: number | null = null;
  draft: Draft = this.emptyDraft();

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.api.getSongs(true).subscribe({
      next: (response) => { this.songs = Array.isArray(response?.songs) ? response.songs : []; this.loading = false; this.cdr.markForCheck(); },
      error: (error) => { this.error = error?.error?.message || 'Could not load songs.'; this.loading = false; this.cdr.markForCheck(); },
    });
  }
  onFile(event: Event): void { this.draft.file = (event.target as HTMLInputElement).files?.[0] ?? null; }
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
    this.api.deleteSong(song.id).subscribe({ next: () => { this.songs = this.songs.filter((item) => item.id !== song.id); this.cdr.markForCheck(); }, error: (error) => { this.error = error?.error?.message || 'Could not delete song.'; this.cdr.markForCheck(); } });
  }
  mediaUrl(song: Song): string { return /^https?:\/\//i.test(song.url) ? song.url : `${this.api.apiBaseUrl}${song.url.startsWith('/') ? '' : '/'}${song.url}`; }
  private emptyDraft(): Draft { return { title: '', subtitle: '', duration: '', sortOrder: 0, active: true, file: null }; }
}
