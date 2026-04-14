import { Component }          from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }        from '../../core/services/auth.service';
import Swal                   from 'sweetalert2';

@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss'
})
export class LoginComponent {
  email    = '';
  password = '';
  loading  = false;
  showPass = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        Swal.fire({
          icon:              'success',
          title:             '¡Bienvenido!',
          text:              'Sesión iniciada correctamente.',
          timer:             1500,
          showConfirmButton: false,
          timerProgressBar:  true
        }).then(() => this.router.navigate(['/dashboard']));
      },
      error: err => {
        this.loading = false;
        Swal.fire({
          icon:             'error',
          title:            'Error al iniciar sesión',
          text:             err.error?.error ?? 'Credenciales inválidas',
          confirmButtonText:'Intentar de nuevo',
          confirmButtonColor:'#1a1a2e'
        });
      }
    });
  }
}
