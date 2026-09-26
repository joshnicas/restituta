import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Subjects } from './subjects';

describe('Subjects', () => {
  let component: Subjects;
  let fixture: ComponentFixture<Subjects>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subjects, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Subjects);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('builds grade summaries with subject counts when not grade-scoped', () => {
    fixture.detectChanges();

    httpMock.expectOne('http://localhost:8000/grades').flush({
      grades: [
        { id: 1, name: 'Standard III', code: 'STANDARD_III', stage: 'PRIMARY', active: true },
      ],
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({
      subjects: [
        { id: 10, name: 'Mathematics', gradeSubjects: [{ gradeId: 1 }] },
        { id: 20, name: 'Science', gradeSubjects: [{ gradeId: 1 }] },
      ],
    });
    httpMock.expectOne('http://localhost:8000/topics').flush({ topics: [] });
    httpMock.expectOne('http://localhost:8000/levels').flush({ levels: [] });
    httpMock.expectOne('http://localhost:8000/questions').flush({ questions: [] });
    fixture.detectChanges();

    expect(component.gradeSummaries.length).toBe(1);
    expect(component.gradeSummaries[0].gradeSubjectsCount).toBe(2);
    expect(component.isGradeScoped).toBe(false);
  });

  it('filters subjects for a specific grade when grade-scoped', () => {
    component.gradeId = 1;
    component.isGradeScoped = true;
    fixture.detectChanges();

    httpMock.expectOne('http://localhost:8000/grades').flush({
      grades: [{ id: 1, name: 'Standard III', code: 'STANDARD_III', stage: 'PRIMARY', active: true }],
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({
      subjects: [
        { id: 10, name: 'Mathematics', gradeSubjects: [{ gradeId: 1 }] },
        { id: 20, name: 'Science', gradeSubjects: [{ gradeId: 1 }] },
      ],
    });
    httpMock.expectOne('http://localhost:8000/topics').flush({
      topics: [
        { id: 100, subjectId: 10, gradeSubjectTopics: [{ gradeSubject: { grade: { id: 1 }, subject: { id: 10 } } }] },
      ],
    });
    httpMock.expectOne('http://localhost:8000/levels').flush({
      levels: [
        { id: 50, gradeSubject: { grade: { id: 1 }, subject: { id: 10 } } },
      ],
    });
    httpMock.expectOne('http://localhost:8000/questions').flush({
      questions: [
        { id: 1000, gameLevel: { gradeSubject: { grade: { id: 1 }, subject: { id: 10 } } } },
      ],
    });
    fixture.detectChanges();

    expect(component.subjects.length).toBe(1);
    expect(component.subjects[0].name).toBe('Mathematics');
    expect(component.subjects[0].levelsCount).toBe(1);
    expect(component.subjects[0].questionsCount).toBe(1);
  });

  it('deletes a confirmed subject and removes it from the list', () => {
    component.gradeId = 1;
    component.isGradeScoped = true;
    fixture.detectChanges();

    httpMock.expectOne('http://localhost:8000/grades').flush({
      grades: [{ id: 1, name: 'Standard III', code: 'STANDARD_III', stage: 'PRIMARY', active: true }],
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({
      subjects: [{ id: 10, name: 'Math', gradeSubjects: [{ gradeId: 1 }] }],
    });
    httpMock.expectOne('http://localhost:8000/topics').flush({ topics: [] });
    httpMock.expectOne('http://localhost:8000/levels').flush({ levels: [] });
    httpMock.expectOne('http://localhost:8000/questions').flush({ questions: [] });
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.deleteSubject(component.subjects[0]);

    const request = httpMock.expectOne('http://localhost:8000/subjects/10');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true });

    expect(component.subjects).toEqual([]);
  });
});
