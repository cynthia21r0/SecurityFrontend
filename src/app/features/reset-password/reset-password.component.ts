import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  token       = '';
  newPassword = '';
  confirmPwd  = '';
  loading     = false;
  successMsg  = '';
  errorMsg    = '';
  tokenValid  = true;

  constructor(
    private auth:  AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Leer el token desde la URL: /reset-password?token=xxxx
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenValid = false;
      this.errorMsg   = 'El enlace no es válido o está incompleto.';
    }
  }

  onSubmit(): void {
    this.errorMsg  = '';
    this.successMsg = '';

    if (this.newPassword !== this.confirmPwd) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMsg = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.loading = true;

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.loading    = false;
        this.successMsg = res.message;
        // Redirigir al login después de 2 segundos
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err.message ?? 'No se pudo restablecer la contraseña.';
      }
    });
  }
}