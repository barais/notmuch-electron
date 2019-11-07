import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AllmailComponent } from './allmail.component';

describe('AllmailComponent', () => {
  let component: AllmailComponent;
  let fixture: ComponentFixture<AllmailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AllmailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AllmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
