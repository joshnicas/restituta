import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home, HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function respondToDashboardRequests(): void {
    httpMock.expectOne('http://localhost:8000/admin/users').flush({
      success: true,
      data: { users: [{ id: 1 }, { id: 2 }] },
    });
    httpMock.expectOne('http://localhost:8000/subjects').flush({
      success: true,
      data: { subjects: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    });
    httpMock.expectOne('http://localhost:8000/questions').flush({
      success: true,
      data: { questions: [{ id: 1 }] },
    });
  }

  it('should create', () => {
    fixture.detectChanges();
    respondToDashboardRequests();
    expect(component).toBeTruthy();
  });

  it('uses the endpoint data collections for the dashboard counts', () => {
    fixture.detectChanges();
    respondToDashboardRequests();
    fixture.detectChanges();

    expect(component.stats).toEqual({ users: 2, subjects: 3, questions: 1 });
    const values = [...(fixture.nativeElement.querySelectorAll('.value') as NodeListOf<HTMLElement>)]
      .map((element) => element.textContent?.trim());
    expect(values).toEqual(['2', '3', '0', '1']);
  });
});
