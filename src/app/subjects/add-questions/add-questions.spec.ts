import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AddQuestionComponent } from './add-questions';
import { DashboardService } from '../../services/dashboard.service';
import { describe, beforeEach, expect, it, vi } from 'vitest';

describe('AddQuestionComponent', () => {
  let component: AddQuestionComponent;
  let fixture: ComponentFixture<AddQuestionComponent>;
  let dashboardService: Pick<DashboardService, 'getGrades' | 'getSubjectsByGrade' | 'getTopicsByGradeSubject' | 'getLevelsByGradeSubject' | 'getGameTypes' | 'createQuestion'>;

  beforeEach(async () => {
    dashboardService = {
      getGrades: vi.fn(),
      getSubjectsByGrade: vi.fn(),
      getTopicsByGradeSubject: vi.fn(),
      getLevelsByGradeSubject: vi.fn(),
      getGameTypes: vi.fn(),
      createQuestion: vi.fn(),
    } as unknown as Pick<DashboardService, 'getGrades' | 'getSubjectsByGrade' | 'getTopicsByGradeSubject' | 'getLevelsByGradeSubject' | 'getGameTypes' | 'createQuestion'>;

    vi.mocked(dashboardService.getGrades).mockReturnValue(of({ grades: [] }));
    vi.mocked(dashboardService.getSubjectsByGrade).mockReturnValue(of({ gradeSubjects: [] }));
    vi.mocked(dashboardService.getTopicsByGradeSubject).mockReturnValue(of({ topics: [] }));
    vi.mocked(dashboardService.getLevelsByGradeSubject).mockReturnValue(of({ levels: [] }));
    vi.mocked(dashboardService.getGameTypes).mockReturnValue(of({ gameTypes: [] }));
    vi.mocked(dashboardService.createQuestion).mockReturnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: dashboardService },
      ],
      imports: [AddQuestionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddQuestionComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include topicId when submitting a question', () => {
    component.selectedGradeId = 1;
    component.selectedGradeSubjectId = 10;
    component.selectedTopicId = 100;
    component.selectedLevelId = 1000;
    component.selectedGameType = { id: 7, name: 'Multiple Choice', code: 'MULTIPLE_CHOICE' };
    component.form.text = 'What is 2 + 2?';
    component.form.options = [
      { text: '3', isCorrect: false, order: 0 },
      { text: '4', isCorrect: true, order: 1 },
    ];

    component.onSubmit();

    expect(dashboardService.createQuestion).toHaveBeenCalled();
    const payload = vi.mocked(dashboardService.createQuestion).mock.calls.at(-1)?.[0];
    expect(payload?.topicId).toBe(100);
    expect(payload?.gameLevelId).toBe(1000);
    expect(payload?.gameTypeId).toBe(7);
  });
});
