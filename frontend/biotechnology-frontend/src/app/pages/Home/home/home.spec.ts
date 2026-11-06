
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicHome } from './home';

describe('PublicHome', () => {
  let component: PublicHome;
  let fixture: ComponentFixture<PublicHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHome],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
