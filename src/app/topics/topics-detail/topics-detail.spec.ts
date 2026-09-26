import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopicsDetail } from './topics-detail';

describe('TopicsDetail', () => {
  let component: TopicsDetail;
  let fixture: ComponentFixture<TopicsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopicsDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(TopicsDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
