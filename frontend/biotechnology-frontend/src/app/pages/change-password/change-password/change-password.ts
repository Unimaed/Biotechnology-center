
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';


@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
    confirmPassword: ['', Validators.required],
  });

  async submit(): Promise<void> {
    this.error.set('');
    this.success.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } =
      this.form.getRawValue();

    if (newPassword !== confirmPassword) {
      this.error.set('The new passwords do not match.');
      return;
    }

    this.loading.set(true);

    try {
      await this.auth.changePassword(currentPassword, newPassword);
      this.success.set('Password changed successfully.');
      await this.router.navigateByUrl('/dashboard');
    } catch (error: any) {
      this.error.set(
        error?.error?.message || 'Unable to change password.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
