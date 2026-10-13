import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';

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
  private readonly i18nService = inject(I18nService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  images: Image[] = [];
  filteredImages: Image[] = [];
  categories: ImageCategory[] = [];
  selectedCategoryId: string = 'all';
  showAddForm = false;
  loading = true;
  categoriesLoading = true;
  error: string | null = null;
  categoryError: string | null = null;
  categorySuccess: string | null = null;
  showCategoryManager = false;
  editingCategoryId: number | null = null;
  categoryNameDraft = '';
  savingCategory = false;
  submitting = false;
  editingImageId: number | null = null;
  imageNameDraft = '';
  imageCategoryDraft: number | null = null;
  imageFileDraft: File | null = null;
  savingImage = false;
  imageEditError: string | null = null;
  imageEditSuccess: string | null = null;
  previewImage: Image | null = null;

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
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.categoriesLoading = false;
        this.categoryError = this.getImageErrorMessage(err);
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
        this.error = this.t('assets.images.delete.error', { message: err.message || 'Unknown error' });
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

  toggleCategoryManager(): void {
    this.showCategoryManager = !this.showCategoryManager;
    this.categoryError = null;
    this.categorySuccess = null;
    this.cancelCategoryEdit();
  }

  editCategory(category: ImageCategory): void {
    this.editingCategoryId = category.id;
    this.categoryNameDraft = category.name;
    this.categoryError = null;
    this.categorySuccess = null;
  }

  cancelCategoryEdit(): void {
    this.editingCategoryId = null;
    this.categoryNameDraft = '';
  }

  saveCategory(): void {
    const name = this.categoryNameDraft.trim();
    if (!name || this.savingCategory) return;

    this.savingCategory = true;
    this.categoryError = null;
    this.categorySuccess = null;
    const editingId = this.editingCategoryId;
    const request = editingId === null
      ? this.dashboardService.createImageCategory({ name })
      : this.dashboardService.updateImageCategory(editingId, { name });

    request.subscribe({
      next: (response) => {
        const saved = this.extractOne<ImageCategory>(response, 'imageCategory');
        if (saved) {
          if (editingId === null) this.categories = [...this.categories, { ...saved, id: Number(saved.id) }];
          else this.categories = this.categories.map((category) => category.id === editingId ? { ...category, ...saved, id: editingId } : category);
          this.images = this.images.map((image) => image.imageCategoryId === Number(saved.id)
            ? { ...image, imageCategory: { ...image.imageCategory, ...saved, id: Number(saved.id) } }
            : image);
          this.filterImages();
        } else {
          this.loadCategories();
        }
        this.categorySuccess = editingId === null ? 'Image category created.' : 'Image category updated.';
        this.savingCategory = false;
        this.cancelCategoryEdit();
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.categoryError = this.getImageErrorMessage(err);
        this.savingCategory = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  deleteCategory(category: ImageCategory): void {
    const imageCount = this.imageCountForCategory(category.id);
    if (imageCount > 0) {
      this.categoryError = `Cannot delete “${category.name}” while it contains ${imageCount} image${imageCount === 1 ? '' : 's'}. Move or delete those images first.`;
      return;
    }
    if (this.savingCategory || !confirm(`Delete the image category “${category.name}”?`)) return;

    this.savingCategory = true;
    this.categoryError = null;
    this.categorySuccess = null;
    this.dashboardService.deleteImageCategory(category.id).subscribe({
      next: () => {
        this.categories = this.categories.filter((item) => item.id !== category.id);
        if (this.selectedCategoryId === String(category.id)) this.onCategoryChange('all');
        this.categorySuccess = 'Image category deleted.';
        this.savingCategory = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.categoryError = this.getImageErrorMessage(err);
        this.savingCategory = false;
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  imageCountForCategory(categoryId: number): number {
    return this.images.filter((image) => image.imageCategoryId === categoryId).length;
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
      this.error = this.t('assets.images.validate');
      this.changeDetectorRef.markForCheck();
      return;
    }

    if (!this.newImage.file) {
      this.error = this.t('assets.images.validate.file');
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
    if (!confirm(this.t('assets.images.confirm.delete'))) return;

    this.dashboardService.deleteImage(id).subscribe({
      next: () => {
        this.images = this.images.filter((img) => img.id !== id);
        this.filterImages();
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.error = this.t('assets.images.delete.error', { message: err.message || 'Unknown error' });
        console.error('Error deleting image:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  editImage(image: Image): void {
    this.editingImageId = image.id;
    this.imageNameDraft = image.name;
    this.imageCategoryDraft = image.imageCategoryId;
    this.imageEditError = null;
    this.imageEditSuccess = null;
    this.imageFileDraft = null;
  }

  cancelImageEdit(): void {
    this.editingImageId = null;
    this.imageNameDraft = '';
    this.imageCategoryDraft = null;
    this.imageFileDraft = null;
    this.imageEditError = null;
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageFileDraft = input.files?.[0] ?? null;
  }

  saveImageEdit(): void {
    const id = this.editingImageId;
    const name = this.imageNameDraft.trim();
    const imageCategoryId = this.imageCategoryDraft;
    if (id === null || !name || !imageCategoryId || this.savingImage) return;

    this.savingImage = true;
    this.imageEditError = null;
    this.imageEditSuccess = null;
    const normalizedName = this.slugify(name);
    const request = this.imageFileDraft
      ? (() => {
          const formData = new FormData();
          formData.append('name', normalizedName);
          formData.append('imageCategoryId', String(imageCategoryId));
          formData.append('image', this.imageFileDraft!);
          return this.dashboardService.updateImage(id, formData);
        })()
      : this.dashboardService.updateImage(id, { name: normalizedName, imageCategoryId });
    request.subscribe({
      next: (response) => {
        const updated = this.extractOne<Image>(response, 'image');
        if (updated) {
          const normalized: Image = { ...updated, id: Number(updated.id), imageCategoryId: Number(updated.imageCategoryId) };
          this.images = this.images.map((image) => image.id === id ? normalized : image);
        } else {
          this.images = this.images.map((image) => image.id === id
            ? { ...image, name: normalizedName, imageCategoryId }
            : image);
        }
        this.filterImages();
        this.savingImage = false;
        this.editingImageId = null;
        this.imageFileDraft = null;
        this.imageEditSuccess = 'Image updated successfully.';
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.savingImage = false;
        this.imageEditError = this.getImageErrorMessage(err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  openImagePreview(image: Image): void {
    this.previewImage = image;
  }

  closeImagePreview(): void {
    this.previewImage = null;
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
    return image.imageCategory?.name ?? this.categories.find((category) => category.id === image.imageCategoryId)?.name ?? this.t('common.inactive');
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
