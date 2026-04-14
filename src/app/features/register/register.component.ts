import { Component }          from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }        from '../../core/services/auth.service';
import Swal                   from 'sweetalert2';

@Component({
  selector:    'app-register',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl:    './register.component.scss'
})
export class RegisterComponent {
  username = '';
  email    = '';
  password = '';
  confirm  = '';
  loading  = false;
  showPass = false;

  constructor(private auth: AuthService, private router: Router) {}

  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const p = this.password;
    if (!p) return null;
    const hasUpper  = /[A-Z]/.test(p);
    const hasNumber = /\d/.test(p);
    const hasSymbol = /[^A-Za-z0-9]/.test(p);
    if (p.length >= 8 && hasUpper && hasNumber && hasSymbol) return 'strong';
    if (p.length >= 8 && hasUpper && hasNumber)              return 'medium';
    return 'weak';
  }

  get passwordValid(): boolean {
    return (
      this.password.length >= 8 &&
      /[A-Z]/.test(this.password)  &&
      /\d/.test(this.password)
    );
  }

  get passwordsMatch(): boolean {
    return this.confirm.length > 0 && this.password === this.confirm;
  }

  onSubmit(): void {
    if (!this.passwordValid) {
      Swal.fire({
        icon:             'warning',
        title:            'Contraseña débil',
        text:             'Debe tener mínimo 8 caracteres, 1 mayúscula y 1 número.',
        confirmButtonColor: '#1a1a2e'
      });
      return;
    }

    if (!this.passwordsMatch) {
      Swal.fire({
        icon:             'warning',
        title:            'Las contraseñas no coinciden',
        text:             'Verifica que ambas contraseñas sean iguales.',
        confirmButtonColor: '#1a1a2e'
      });
      return;
    }

    this.loading = true;

    this.auth.register(this.username, this.email, this.password).subscribe({
      next: () => {
        Swal.fire({
          icon:              'success',
          title:             '¡Cuenta creada!',
          text:              'Tu cuenta fue registrada correctamente.',
          timer:             2000,
          showConfirmButton: false,
          timerProgressBar:  true
        }).then(() => this.router.navigate(['/login']));
      },
      error: err => {
        this.loading = false;

        const msg = err.error?.error ?? 'Error al registrar la cuenta';
        const isConflict = err.status === 409;

        Swal.fire({
          icon:               isConflict ? 'warning' : 'error',
          title:              isConflict ? 'Datos ya registrados' : 'Error al registrar',
          text:               msg,
          confirmButtonText:  'Entendido',
          confirmButtonColor: '#1a1a2e'
        });
      }
    });
  }
}
