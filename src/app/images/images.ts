import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

interface ImageCategory {
  id: number;
  name: string;
}

interface Image {
  id: number;
  name: string;
  imageCategoryId: number;
  url: string | null;
  imageCategory?: ImageCategory | null;
}

type ApiRecord = Record<string, unknown>;

@Component({
  selector: 'app-images',
  imports: [CommonModule, FormsModule],
  templateUrl: './images.html',
  styleUrl: './images.scss',
})
export class Images implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  images: Image[] = [];
  filteredImages: Image[] = [];
  categories: ImageCategory[] = [];
  selectedCategoryId: string = 'all';
  showAddForm = false;
  loading = true;
  categoriesLoading = true;
  error: string | null = null;
  submitting = false;

  newImage = {
    name: '',
    imageCategoryId: null as number | null,
    file: null as File | null,
  };

  ngOnInit(): void {
    this.loadCategories();
    this.loadImages();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.dashboardService.getImageCategories().subscribe({
      next: (response) => {
        this.categories =
          this.normalizeCategories(this.extractList<ImageCategory>(response, 'imageCategories')) ||
          this.normalizeCategories(this.extractList<ImageCategory>(response, 'image_categories')) ||
          this.normalizeCategories(this.extractList<ImageCategory>(response, 'categories'));
        this.categoriesLoading = false;
        if (this.categories.length === 0) {
          this.error = 'No image categories were returned by the backend.';
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.categoriesLoading = false;
        this.error = `Failed to load image categories: ${err.message || 'Unknown error'}`;
        console.error('Error loading image categories:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  loadImages(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getImages().subscribe({
      next: (response) => {
        this.images = this.extractList<Image>(response, 'images');
        this.filterImages();
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to load images: ${err.message || 'Unknown error'}`;
        this.loading = false;
        console.error('Error loading images:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  filterImages(): void {
    if (this.selectedCategoryId === 'all') {
      this.filteredImages = this.images;
      return;
    }

    const categoryId = Number(this.selectedCategoryId);
    this.filteredImages = this.images.filter((img) => img.imageCategoryId === categoryId);
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.filterImages();
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
      this.newImage.file = input.files[0];
    }
  }

  addImage(): void {
    const imageCategoryId = this.newImage.imageCategoryId;

    if (!this.newImage.name.trim() || !Number.isFinite(imageCategoryId ?? NaN)) {
      this.error = 'Please provide a name and image category';
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (!this.newImage.file) {
      this.error = 'Please upload an image file';
      this.changeDetectorRef.markForCheck();
      return;
    }

    this.submitting = true;
    this.error = null;

    const formData = new FormData();
    const normalizedName = this.slugify(this.newImage.name.trim());
    formData.append('name', normalizedName);
    formData.append('imageCategoryId', String(imageCategoryId));

    if (this.newImage.file) {
      formData.append('image', this.newImage.file);
    }

    this.dashboardService.uploadImage(formData).subscribe({
      next: (response) => {
        const uploaded = this.extractOne<Image>(response, 'image') || this.extractOne<Image>(response, 'data');
        if (uploaded) {
          this.images.unshift(uploaded);
          this.filterImages();
        } else {
          this.loadImages();
        }
        this.submitting = false;
        this.resetForm();
        this.showAddForm = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.submitting = false;
        this.error = this.getImageErrorMessage(err);
        console.error('Error uploading image:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  deleteImage(id: number): void {
    if (!confirm('Are you sure you want to delete this image?')) return;

    this.dashboardService.deleteImage(id).subscribe({
      next: () => {
        this.images = this.images.filter((img) => img.id !== id);
        this.filterImages();
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = `Failed to delete image: ${err.message || 'Unknown error'}`;
        console.error('Error deleting image:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  resetForm(): void {
    this.newImage = {
      name: '',
      imageCategoryId: null,
      file: null,
    };
    this.error = null;
  }

  getCategoryName(image: Image): string {
    return image.imageCategory?.name ?? this.categories.find((category) => category.id === image.imageCategoryId)?.name ?? 'Unknown';
  }

  trackByCategoryId(_: number, category: ImageCategory): number {
    return category.id;
  }

  trackByImageId(_: number, image: Image): number {
    return image.id;
  }

  getImageSrc(image: Image): string {
    const url = image.url?.trim();
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

  private normalizeCategories(categories: ImageCategory[]): ImageCategory[] {
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
      || 'image';
  }

  private getImageErrorMessage(err: unknown): string {
    const fallback = 'Failed to upload image';

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
