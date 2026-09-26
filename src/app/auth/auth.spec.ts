import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthComponent } from './auth';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a 401 error and re-enables the login button', () => {
    component.email = 'admin@example.com';
    component.password = 'wrong-password';

    component.onSubmit();
    expect(component.isLoading).toBe(true);

    const request = httpMock.expectOne('http://localhost:8000/admin/login');
    expect(request.request.body).toEqual({
      email: 'admin@example.com',
      password: 'wrong-password',
    });
    request.flush(
      { success: false, message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Invalid email or password.');
    expect(fixture.nativeElement.querySelector('.btn-primary').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.error-message').textContent)
      .toContain('Invalid email or password.');
  });
});
