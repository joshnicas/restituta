import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('Rank', () => {
  let component: Rank;
  let fixture: ComponentFixture<Rank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rank]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rank);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
