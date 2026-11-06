import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Grades } from './grades';

describe('Grades', () => {
  let component: Grades;
  let fixture: ComponentFixture<Grades>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Grades, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Grades);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:8000/grades').flush({ grades: [] });
    httpMock.expectOne('http://localhost:8000/subjects').flush({ subjects: [] });
    httpMock.expectOne('http://localhost:8000/levels').flush({ levels: [] });
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('counts subjects and levels per grade without requesting question totals', () => {
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:8000/grades').flush({
      grades: [
        { id: 1, name: 'Standard III', code: 'STANDARD_III', level: 3, stage: 'PRIMARY', active: true },
      ],
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({
      subjects: [
        {
          id: 100,
          name: 'Mathematics',
          code: 'MATH',
          gradeSubjects: [{ id: 20, gradeId: 1 }],
        },
      ],
    });
    httpMock.expectOne('http://localhost:8000/levels').flush({
      levels: [
        { id: 50, gradeSubjectTopic: { gradeSubject: { grade: { id: 1 } } } },
        { id: 51, gradeSubjectTopic: { gradeSubject: { grade: { id: 1 } } } },
      ],
    });
    fixture.detectChanges();

    expect(component.grades[0].subjectsCount).toBe(1);
    expect(component.grades[0].levelsCount).toBe(2);
    expect(component.grades[0].questionsCount).toBe(0);
  });

  it('deletes a confirmed grade and removes it from the list', () => {
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:8000/grades').flush({
      grades: [{ id: 1, name: 'Standard III', code: 'STANDARD_III', level: 3, stage: 'PRIMARY', active: true }],
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({ subjects: [] });
    httpMock.expectOne('http://localhost:8000/levels').flush({ levels: [] });
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.deleteGrade(component.grades[0]);

    const request = httpMock.expectOne('http://localhost:8000/grades/1');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true });

    expect(component.grades).toEqual([]);
  });
});
