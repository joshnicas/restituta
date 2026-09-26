import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelsDetail } from './levels-detail';

describe('LevelsDetail', () => {
  let component: LevelsDetail;
  let fixture: ComponentFixture<LevelsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelsDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(LevelsDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
