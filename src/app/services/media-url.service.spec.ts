import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MediaUrlService } from './media-url.service';
import { environment } from '../../environments/environment';

describe('MediaUrlService', () => {
  let service: MediaUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MediaUrlService] });
    service = TestBed.inject(MediaUrlService);
  });

  it('resolves legacy relative media paths against the configured API origin', () => {
    expect(service.resolve('/images/example.png')).toBe(`${environment.apiBaseUrl}/images/example.png`);
    expect(service.resolve('audios/example.mp3')).toBe(`${environment.apiBaseUrl}/audios/example.mp3`);
  });

  it('preserves absolute HTTP and HTTPS URLs', () => {
    expect(service.resolve('https://cdn.example.test/a.png')).toBe('https://cdn.example.test/a.png');
    expect(service.resolve('http://localhost:9000/songs/a.mp4')).toBe('http://localhost:9000/songs/a.mp4');
  });

  it('does not duplicate slashes and safely handles missing values', () => {
    expect(service.resolve('  /images/a.png  ')).toBe(`${environment.apiBaseUrl}/images/a.png`);
    expect(service.resolve('')).toBe('');
    expect(service.resolve(null)).toBe('');
    expect(service.resolve(undefined)).toBe('');
  });
});
