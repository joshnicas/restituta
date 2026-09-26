import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './data';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should login and store the token response', () => {
    service.login({ email: 'admin@example.com', password: 'secret' }).subscribe((response) => {
      expect(response.token).toBe('abc123');
    });

    const req = httpMock.expectOne('http://localhost:8000/admin/login');
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'abc123', message: 'Login successful' });
  });

  it('should report the user as logged in when a token exists', () => {
    localStorage.setItem('token', 'abc123');
    expect(service.isLoggedIn()).toBe(true);
  });
});
