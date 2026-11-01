import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(255),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.maxLength(200),
      ],
    ],
  });

  async submit(): Promise<void> {
    this.error.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      const { email, password } = this.form.getRawValue();

      await this.auth.login(email.trim(), password);

      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl');

      const safeReturnUrl =
        returnUrl?.startsWith('/') &&
        !returnUrl.startsWith('//') &&
        !returnUrl.startsWith('/change-password')
          ? returnUrl
          : '/dashboard';

      const destination = this.auth.mustChangePassword()
        ? '/change-password'
        : safeReturnUrl;

      await this.router.navigateByUrl(destination);

    } catch (error: unknown) {
      const apiError = error as {
        error?: { message?: string };
        message?: string;
      };

      this.error.set(
        apiError?.error?.message ||
        apiError?.message ||
        'Unable to sign in. Please check your login details.'
      );

    } finally {
      this.loading.set(false);
    }
  }
}