import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Rank } from './rank';
import { describe, beforeEach, expect, it } from 'vitest';

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
