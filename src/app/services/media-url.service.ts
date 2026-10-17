import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaUrlService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  resolve(value: string | null | undefined): string {
    const url = value?.trim();
    if (!url) return '';
    if (/^(?:https?:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url)) return url;
    const base = this.apiBaseUrl.trim().replace(/\/+$/, '');
    if (!base) return url.startsWith('/') ? url : `/${url}`;
    return `${base}/${url.replace(/^\/+/, '')}`;
  }
}
