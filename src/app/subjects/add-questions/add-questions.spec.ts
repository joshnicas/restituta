import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AddQuestionComponent } from './add-questions';
import { DashboardService } from '../../services/dashboard.service';

describe('AddQuestionComponent', () => {
  let component: AddQuestionComponent;
  let fixture: ComponentFixture<AddQuestionComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'getGrades',
      'getSubjectsByGrade',
      'getTopicsByGradeSubject',
      'getLevelsByGradeSubject',
      'getGameTypes',
      'createQuestion',
    ]);

    dashboardService.getGrades.and.returnValue(of({ grades: [] }));
    dashboardService.getSubjectsByGrade.and.returnValue(of({ gradeSubjects: [] }));
    dashboardService.getTopicsByGradeSubject.and.returnValue(of({ topics: [] }));
    dashboardService.getLevelsByGradeSubject.and.returnValue(of({ levels: [] }));
    dashboardService.getGameTypes.and.returnValue(of({ gameTypes: [] }));
    dashboardService.createQuestion.and.returnValue(of({ success: true }));

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
    const payload = dashboardService.createQuestion.calls.mostRecent().args[0];
    expect(payload.topicId).toBe(100);
    expect(payload.gameLevelId).toBe(1000);
    expect(payload.gameTypeId).toBe(7);
  });
});
