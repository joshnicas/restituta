import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardService } from '../services/dashboard.service';
import { I18nService } from '../services/i18n.service';
import { ManageQuestions } from './manage-questions';

describe('ManageQuestions', () => {
  let fixture: ComponentFixture<ManageQuestions>;
  let component: ManageQuestions;

  beforeEach(async () => {
    const dashboardService = {
      getTopicsByGradeSubject: vi.fn(() => of({ topics: [] })),
      getLevelsByGradeSubject: vi.fn(() => of({ levels: [{
        id: '42',
        gradeSubjectId: '7',
        levelNumber: '1',
        name: 'Getting Started',
        difficulty: 'EASY',
      }] })),
      getGameTypes: vi.fn(() => of({ gameTypes: [] })),
      getQuestions: vi.fn(() => of([{ id: '10', gameLevelId: '42', gameTypeId: '3', text: 'Example question' }])),
      getQuestion: vi.fn(() => of({ question: { id: '10', gameLevelId: '42', gameTypeId: '3', text: 'Swahili question' } })),
    };

    await TestBed.configureTestingModule({
      imports: [ManageQuestions],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageQuestions);
    component = fixture.componentInstance;
    component.selectedGradeId = 1;
    component.selectedGradeSubjectId = 7;
  });

  it('normalizes level IDs so the selected level filters its questions', () => {
    component.loadQuestionsAndFilters(7);

    expect(component.levels[0].id).toBe(42);
    component.filterLevelId = component.levels[0].id;
    component.applyFilters();

    expect(component.filteredQuestions).toHaveLength(1);
    expect(component.filteredQuestions[0].id).toBe(10);
  });

  it('switches one question to its saved Swahili version without opening the editor', () => {
    component.loadQuestionsAndFilters(7);
    component.toggleQuestionLanguage(component.filteredQuestions[0]);

    expect(component.displayQuestions[0].text).toBe('Swahili question');
  });

  it('preserves both true and false answers from the API', () => {
    const mapQuestion = (component as any).mapQuestion.bind(component);

    expect(mapQuestion({ id: '20', trueFalseAnswer: true }).trueFalseAnswer).toBe(true);
    expect(mapQuestion({ id: '21', trueFalseAnswer: false }).trueFalseAnswer).toBe(false);
  });
});
