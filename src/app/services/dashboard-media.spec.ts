import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../environments/environment';

describe('DashboardService media uploads', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [DashboardService] });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts image, audio, and song FormData using the established endpoints', () => {
    const image = new FormData(); image.append('image', new Blob(['image']), 'a.png');
    const audio = new FormData(); audio.append('audio', new Blob(['audio']), 'a.mp3');
    const song = new FormData(); song.append('media', new Blob(['video']), 'a.mp4');

    service.uploadImage(image).subscribe();
    const imageRequest = http.expectOne(`${environment.apiBaseUrl}/images`);
    expect(imageRequest.request.method).toBe('POST');
    expect(imageRequest.request.body).toBe(image);
    expect(imageRequest.request.headers.has('Content-Type')).toBe(false);
    imageRequest.flush({ success: true, image: { url: '/images/a.png' } });

    service.uploadAudio(audio).subscribe();
    const audioRequest = http.expectOne(`${environment.apiBaseUrl}/audios`);
    expect(audioRequest.request.body).toBe(audio);
    expect(audioRequest.request.headers.has('Content-Type')).toBe(false);
    audioRequest.flush({ success: true, audio: { url: '/audios/a.mp3' } });

    service.createSong(song).subscribe();
    const songRequest = http.expectOne(`${environment.apiBaseUrl}/songs`);
    expect(songRequest.request.body).toBe(song);
    expect(songRequest.request.headers.has('Content-Type')).toBe(false);
    songRequest.flush({ success: true, song: { url: '/songs/a.mp4' } });
  });
});
