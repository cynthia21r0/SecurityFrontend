import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email       = '';
  loading     = false;
  successMsg  = '';
  errorMsg    = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.email.trim()) {
      this.errorMsg = 'Ingresa tu correo electrónico.';
      return;
    }

    this.loading    = true;
    this.errorMsg   = '';
    this.successMsg = '';

    this.auth.forgotPassword(this.email.trim().toLowerCase()).subscribe({
      next: (res) => {
        this.loading    = false;
        this.successMsg = res.message;
        this.email      = '';
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err.message ?? 'No se pudo procesar la solicitud.';
      }
    });
  }
}