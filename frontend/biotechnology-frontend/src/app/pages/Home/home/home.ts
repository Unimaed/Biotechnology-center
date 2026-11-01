
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class PublicHome implements AfterViewInit, OnDestroy {
  readonly year = new Date().getFullYear();

  // All 13 homepage slideshow images
  readonly heroSlides = [
    {
      src: '/images/Slide1.jpg',
      alt: 'Biotechnology Centre',
      title: 'Biotechnology Centre',
      description: 'Advancing research, innovation and biotechnology development.',
    },
    {
      src: '/images/Slide3.jpg',
      alt: 'Biotechnology laboratory',
      title: 'Modern Laboratory Facilities',
      description: 'Supporting practical research, training and scientific discovery.',
    },
   
    {
      src: '/images/Slide55.jpg',
      alt: 'Centre facilities and equipment',
      title: 'Facilities and Equipment',
      description: 'Modern facilities supporting biotechnology research.',
    },
    {
      src: '/images/Slide11.jpg',
      alt: 'Laboratory facilities',
      title: 'Laboratory Facilities',
      description: 'Supporting scientific research and laboratory activities.',
    },
    {
      src: '/images/Slide12.jpg',
      alt: 'Laboratory equipment',
      title: 'Research Equipment',
      description: 'Equipment supporting biotechnology research.',
    },
    {
      src: '/images/Slide6.jpg',
      alt: 'Plant tissue culture laboratory',
      title: 'Plant Tissue Culture Laboratory',
      description: 'Promoting plant tissue culture research and development.',
    },
    
    {
      src: '/images/Slide8.jpg',
      alt: 'Acacia senegal research',
      title: 'Acacia senegal Research',
      description: 'Research on Acacia senegal micropropagation.',
    },
    {
      src: '/images/Slide9.jpg',
      alt: 'Acacia senegal plant research',
      title: 'Plant Research and Development',
      description: 'Supporting sustainable agricultural research.',
    },
   
  ];

  // Current active slideshow image
  currentSlide = 0;

  // Automatic transition interval: 5 seconds
  private readonly slideInterval = 5000;

  private slideTimer?: ReturnType<typeof setInterval>;
  private observer?: IntersectionObserver;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private changeDetector: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.startSlideshow();
    this.initializeScrollReveal();
  }

  // Automatically move to the next image
  private startSlideshow(): void {
    this.stopSlideshow();

    if (this.heroSlides.length <= 1) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.slideTimer = setInterval(() => {
        this.ngZone.run(() => {
          this.currentSlide =
            (this.currentSlide + 1) % this.heroSlides.length;

          this.changeDetector.detectChanges();
        });
      }, this.slideInterval);
    });
  }

  // Display the previous image
  showPreviousSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + this.heroSlides.length) %
      this.heroSlides.length;

    this.changeDetector.detectChanges();
    this.restartSlideshow();
  }

  // Display the next image
  showNextSlide(): void {
    this.currentSlide =
      (this.currentSlide + 1) % this.heroSlides.length;

    this.changeDetector.detectChanges();
    this.restartSlideshow();
  }

  // Display a selected image using the indicators
  goToSlide(index: number): void {
    if (index < 0 || index >= this.heroSlides.length) {
      return;
    }

    this.currentSlide = index;

    this.changeDetector.detectChanges();
    this.restartSlideshow();
  }

  // Restart automatic slideshow after manual navigation
  private restartSlideshow(): void {
    this.startSlideshow();
  }

  // Stop slideshow timer
  private stopSlideshow(): void {
    if (this.slideTimer !== undefined) {
      clearInterval(this.slideTimer);
      this.slideTimer = undefined;
    }
  }

  // Reveal sections when they enter the viewport
  private initializeScrollReveal(): void {
    const sections =
      this.elementRef.nativeElement.querySelectorAll('.reveal');

    if (typeof IntersectionObserver === 'undefined') {
      sections.forEach((section) => {
        section.classList.add('visible');
      });

      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    sections.forEach((section) => {
      this.observer?.observe(section);
    });
  }

  // Clean up resources when leaving the homepage
  ngOnDestroy(): void {
    this.stopSlideshow();
    this.observer?.disconnect();
  }
}
