import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserGameProfile } from './user-game-profile';

describe('UserGameProfile', () => {
  let component: UserGameProfile;
  let fixture: ComponentFixture<UserGameProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserGameProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserGameProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});