import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsDetail } from './questions-detail';

describe('QuestionsDetail', () => {
  let component: QuestionsDetail;
  let fixture: ComponentFixture<QuestionsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionsDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
