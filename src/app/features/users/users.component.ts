import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  protected auth = inject(AuthService);
  private userService = inject(UserService);

  users = signal<User[]>([]);
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar usuarios',
          text: err.error?.error ?? err.message,
          confirmButtonColor: '#1D9E75',
        });
      },
    });
  }

  viewUser(user: User): void {
    const roles = user.roles
      .map(
        (r) => `
    <span style="
      display:inline-block;padding:2px 10px;border-radius:20px;
      font-size:11px;font-weight:600;margin:2px;
      background:${r.name === 'admin' ? '#534AB7' : r.name === 'manager' ? '#0F6E56' : '#444441'};
      color:${r.name === 'admin' ? '#EEEDFE' : r.name === 'manager' ? '#E1F5EE' : '#F1EFE8'}
    ">${r.name}</span>
  `,
      )
      .join('');

    const isAdmin = user.roles.some((r) => r.name === 'admin');
    const canToggle = !(user.is_active && isAdmin);

    Swal.fire({
      title: `👤 ${user.username}`,
      html: `
      <table style="width:100%;text-align:left;font-size:14px;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:8px 0;color:#888;width:100px">ID</td>
          <td style="padding:8px 0;font-weight:500">${user.id}</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0">
          <td style="padding:8px 0;color:#888">Email</td>
          <td style="padding:8px 0">${user.email}</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0">
          <td style="padding:8px 0;color:#888">Roles</td>
          <td style="padding:8px 0">${roles || '—'}</td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0">
          <td style="padding:8px 0;color:#888">Estado</td>
          <td style="padding:8px 0">
            <span style="
              display:inline-block;padding:2px 10px;border-radius:20px;
              font-size:11px;font-weight:600;
              background:${user.is_active ? '#E1F5EE' : '#FCEBEB'};
              color:${user.is_active ? '#0F6E56' : '#E24B4A'}
            ">${user.is_active ? 'Activo' : 'Inactivo'}</span>
          </td>
        </tr>
        <tr style="border-top:1px solid #f0f0f0">
          <td style="padding:8px 0;color:#888">Creado</td>
          <td style="padding:8px 0">${new Date(user.created_at).toLocaleString('es-MX')}</td>
        </tr>
      </table>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">

        <button id="btn-role" style="
          padding:8px 16px;border-radius:8px;border:1px solid #9FE1CB;
          background:#E1F5EE;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer
        ">🛡 Asignar rol</button>

        <button id="btn-toggle"
          ${!canToggle ? 'disabled title="No se puede desactivar un administrador"' : ''}
          style="
            padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
            border:1px solid ${user.is_active ? '#F7C1C1' : '#9FE1CB'};
            background:${user.is_active ? '#FCEBEB' : '#E1F5EE'};
            color:${user.is_active ? '#E24B4A' : '#0F6E56'};
            opacity:${!canToggle ? '0.4' : '1'};
            cursor:${!canToggle ? 'not-allowed' : 'pointer'}
          ">
          ${user.is_active ? '🚫 Desactivar' : '✅ Activar'}
        </button>

      </div>

      ${
        isAdmin && user.is_active
          ? `
        <p style="font-size:12px;color:#E24B4A;margin-top:12px;text-align:center">
          ⚠️ No se puede desactivar un usuario administrador
        </p>
      `
          : ''
      }
    `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 480,
      didOpen: () => {
        document.getElementById('btn-role')?.addEventListener('click', () => {
          Swal.close();
          setTimeout(() => this.assignRole(user), 200);
        });

        document.getElementById('btn-toggle')?.addEventListener('click', () => {
          if (!canToggle) return;
          Swal.close();
          setTimeout(() => this.toggleActivation(user), 200);
        });
      },
    });
  }

  assignRole(user: User): void {
    const currentRoles = user.roles.map((r) => r.name);

    Swal.fire({
      title: `Asignar rol a ${user.username}`,
      html: `
        <p style="font-size:14px;color:#888;margin-bottom:16px">
          Roles actuales:
          ${currentRoles.map((r) => `<strong>${r}</strong>`).join(', ') || '—'}
        </p>
        <select id="swal-role" style="
          width:100%;height:40px;padding:0 12px;
          border:1px solid #ddd;border-radius:8px;
          font-size:14px;outline:none;
        ">
          <option value="user">user</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1D9E75',
      cancelButtonColor: '#888780',
      reverseButtons: true,
      preConfirm: () => {
        const select = document.getElementById('swal-role') as HTMLSelectElement;
        return select.value;
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.userService.assignRole(user.id, result.value).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Rol asignado',
            text: `El rol "${result.value}" fue asignado a ${user.username}.`,
            timer: 1800,
            showConfirmButton: false,
            timerProgressBar: true,
          });
          this.loadUsers();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error al asignar rol',
            text: err.error?.error ?? err.message,
            confirmButtonColor: '#1D9E75',
          }),
      });
    });
  }

  toggleActivation(user: User): void {
    // ✅ Bloquear desactivación de admins
    if (user.is_active && user.roles.some((r) => r.name === 'admin')) {
      Swal.fire({
        icon: 'error',
        title: 'Acción no permitida',
        text: 'No se puede desactivar a un usuario con rol administrador.',
        confirmButtonColor: '#1D9E75',
      });
      return;
    }

    const activating = !user.is_active;

    Swal.fire({
      title: activating ? `¿Activar a ${user.username}?` : `¿Desactivar a ${user.username}?`,
      text: activating
        ? 'El usuario podrá iniciar sesión nuevamente.'
        : 'El usuario no podrá iniciar sesión.',
      icon: activating ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: activating ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: activating ? '#1D9E75' : '#E24B4A',
      cancelButtonColor: '#888780',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;

      const request$ = activating
        ? this.userService.activate(user.id)
        : this.userService.deactivate(user.id);

      request$.subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: activating ? 'Usuario activado' : 'Usuario desactivado',
            text: `${user.username} fue ${activating ? 'activado' : 'desactivado'} correctamente.`,
            timer: 1800,
            showConfirmButton: false,
            timerProgressBar: true,
          });
          this.loadUsers();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.error ?? err.message,
            confirmButtonColor: '#1D9E75',
          }),
      });
    });
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      admin: 'badge badge--admin',
      manager: 'badge badge--manager',
      user: 'badge badge--user',
    };
    return map[role] ?? 'badge badge--user';
  }
}
