import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutomatorComponent } from './automator.component';

describe('AutomatorComponent', () => {
  let component: AutomatorComponent;
  let fixture: ComponentFixture<AutomatorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AutomatorComponent]
    });
    fixture = TestBed.createComponent(AutomatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
