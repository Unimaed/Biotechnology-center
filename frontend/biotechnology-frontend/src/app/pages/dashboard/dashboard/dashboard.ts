
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';


interface DashboardModule {
  title: string;
  description: string;
  icon: string;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modules: DashboardModule[] = [
    {
      title: 'Research Projects',
      description: 'Manage biotechnology research projects and activities.',
      icon: '🔬',
      status: 'Coming next',
    },
    {
      title: 'Publications',
      description: 'Manage journals, articles and research publications.',
      icon: '📚',
      status: 'Coming next',
    },
    {
      title: 'News & Updates',
      description: 'Publish centre announcements and research news.',
      icon: '📰',
      status: 'Coming next',
    },
    {
      title: 'Events',
      description: 'Manage conferences, workshops and centre events.',
      icon: '📅',
      status: 'Coming next',
    },
    {
      title: 'Staff & Researchers',
      description: 'Manage centre personnel and researcher profiles.',
      icon: '👥',
      status: 'Coming next',
    },
    {
      title: 'Facilities',
      description: 'Manage laboratories, equipment and centre facilities.',
      icon: '🧪',
      status: 'Coming next',
    },
  ];

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
