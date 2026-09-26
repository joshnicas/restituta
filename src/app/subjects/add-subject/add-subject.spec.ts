import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AddSubject } from './add-subject';

describe('AddSubject', () => {
  let component: AddSubject;
  let fixture: ComponentFixture<AddSubject>;
  let httpMock: HttpTestingController;
  let router: Router;

  afterEach(() => httpMock.verify());

  describe('without query params', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [AddSubject, HttpClientTestingModule],
        providers: [provideRouter([])],
      }).compileComponents();
      fixture = TestBed.createComponent(AddSubject);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      fixture.detectChanges();
    });

    it('creates the subject together with its grade placements', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');

      httpMock.expectOne('http://localhost:8000/grades').flush({
        grades: [
          { id: 1, name: 'Standard III', code: 'STANDARD_III', stage: 'PRIMARY' },
          { id: 2, name: 'Standard IV', code: 'STANDARD_IV', stage: 'PRIMARY' },
        ],
      });
      fixture.detectChanges();

      component.name = 'Mathematics';
      component.toggleGrade(component.grades[0], true);

      component.save();

      const request = httpMock.expectOne('http://localhost:8000/subjects');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        name: 'Mathematics',
        active: true,
        gradeIds: [1],
      });
      request.flush({ subject: { id: 10 } });

      expect(navigateSpy).toHaveBeenCalledWith(['/subjects'], {});
    });

    it('blocks saving until at least one grade is chosen', () => {
      httpMock.expectOne('http://localhost:8000/grades').flush({ grades: [] });
      fixture.detectChanges();

      component.name = 'Physics';
      component.save();

      httpMock.expectNone('http://localhost:8000/subjects');
      expect(component.error).toContain('at least one grade');
    });
  });

  describe('with ?gradeId= scope', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [AddSubject, HttpClientTestingModule],
        providers: [
          provideRouter([]),
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({ gradeId: '3' }) } },
          },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(AddSubject);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('preselects the scoped grade and returns there after saving', () => {
      httpMock.expectOne('http://localhost:8000/grades').flush({
        grades: [
          { id: 3, name: 'Standard V', code: 'STANDARD_V', stage: 'PRIMARY' },
          { id: 4, name: 'Standard VI', code: 'STANDARD_VI', stage: 'PRIMARY' },
        ],
      });
      fixture.detectChanges();

      const scoped = component.grades.find((g) => g.id === 3)!;
      const other = component.grades.find((g) => g.id === 4)!;
      expect(component.isSelected(scoped)).toBe(true);
      expect(component.isSelected(other)).toBe(false);

      const navigateSpy = vi.spyOn(router, 'navigate');
      component.name = 'Biology';
      component.save();

      const request = httpMock.expectOne('http://localhost:8000/subjects');
      expect(request.request.body).toEqual({
        name: 'Biology',
        active: true,
        gradeIds: [3],
      });
      request.flush({ subject: { id: 11 } });

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/subjects'],
        { queryParams: { gradeId: 3 } },
      );
    });
  });
});