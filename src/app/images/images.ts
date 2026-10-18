import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';
import { MediaUrlService } from '../services/media-url.service';

interface ImageCategory {
  id: number;
  name: string;
  imageCount?: number;
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
  private readonly mediaUrlService = inject(MediaUrlService);

  protected readonly t = this.i18nService.t.bind(this.i18nService);

  images: Image[] = [];
  filteredImages: Image[] = [];
  readonly pageSize = 18;
  currentPage = 1;
  totalImages = 0;
  totalPages = 0;
  categories: ImageCategory[] = [];
  selectedCategoryId: string = 'all';
  searchQuery = '';
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
  private imageRequestId = 0;
  private searchDebounce: ReturnType<typeof setTimeout> | undefined;

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

  loadImages(page = 1): void {
    const requestId = ++this.imageRequestId;
    this.loading = true;
    this.error = null;

    const categoryId = this.selectedCategoryId === 'all' ? undefined : Number(this.selectedCategoryId);
    this.dashboardService.getImages({
      page,
      limit: this.pageSize,
      ...(categoryId ? { categoryId } : {}),
      ...(this.searchQuery.trim() ? { search: this.searchQuery.trim() } : {}),
    }).subscribe({
      next: (response) => {
        if (requestId !== this.imageRequestId) return;
        this.images = this.extractList<Image>(response, 'images');
        this.filterImages();
        const metadata = this.isRecord(response) ? response : {};
        this.currentPage = this.readNumber(metadata, 'page') ?? page;
        this.totalImages = this.readNumber(metadata, 'total') ?? this.images.length;
        this.totalPages = this.readNumber(metadata, 'totalPages') ?? Math.max(1, Math.ceil(this.totalImages / this.pageSize));
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        if (requestId !== this.imageRequestId) return;
        this.error = this.t('assets.images.delete.error', { message: err.message || 'Unknown error' });
        this.loading = false;
        console.error('Error loading images:', err);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  filterImages(): void {
    this.filteredImages = this.images;
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.loadImages(1);
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.loadImages(1);
      this.searchDebounce = undefined;
    }, 250);
  }

  clearSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchQuery = '';
    this.loadImages(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage || this.loading) return;
    this.loadImages(page);
  }

  get paginationStart(): number {
    return this.totalImages === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalImages);
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
    const category = this.categories.find((item) => item.id === categoryId);
    return category?.imageCount ?? this.images.filter((image) => image.imageCategoryId === categoryId).length;
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
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.error = 'Choose an image file.';
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'Image files must be 5 MB or smaller.';
        input.value = '';
        return;
      }
      this.error = null;
      this.newImage.file = file;
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
          this.loadImages(1);
          this.loadCategories();
        } else {
          this.loadImages(1);
          this.loadCategories();
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
        this.loadImages(this.images.length === 1 && this.currentPage > 1 ? this.currentPage - 1 : this.currentPage);
        this.loadCategories();
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
    const file = input.files?.[0] ?? null;
    if (file && !file.type.startsWith('image/')) {
      this.imageEditError = 'Choose an image file.';
      input.value = '';
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      this.imageEditError = 'Image files must be 5 MB or smaller.';
      input.value = '';
      return;
    }
    this.imageEditError = null;
    this.imageFileDraft = file;
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
        this.loadImages(1);
        this.loadCategories();
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
    return this.mediaUrlService.resolve(image.url);
  }

  onPreviewError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.hidden = true;
    const fallback = document.createElement('div');
    fallback.className = 'empty-preview';
    fallback.textContent = 'Image unavailable';
    image.parentElement?.append(fallback);
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

  private readNumber(record: ApiRecord, key: string): number | undefined {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return undefined;
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
