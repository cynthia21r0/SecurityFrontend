import { Component, OnInit, WritableSignal, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService, AuditLog } from '../../core/services/user.service';
import { User } from '../../models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected auth = inject(AuthService);
  private userService = inject(UserService);

  currentUser: WritableSignal<User | null> = this.auth.currentUser;

  totalUsers = signal<number>(0);
  activeUsers = signal<number>(0);
  recentLogs = signal<AuditLog[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit(): void {
    if (this.auth.hasAnyRole(['admin', 'manager'])) {
      this.loadStats();
    } else {
      this.loading.set(false);
    }
  }

  private loadStats(): void {
    this.loading.set(true);

    this.userService.getAll().subscribe({
      next: (users: User[]) => {
        this.totalUsers.set(users.length);
        this.activeUsers.set(users.filter((u) => u.is_active).length);
      },
      error: (err) => {
        this.showError('No se pudieron cargar los usuarios', err.error?.error ?? err.message);
        this.loading.set(false);
      },
    });

    if (this.auth.hasRole('admin')) {
      this.userService.getAuditLogs().subscribe({
        next: (logs) => {
          this.recentLogs.set(logs.slice(0, 5));
          this.loading.set(false);
        },
        error: (err) => {
          this.showError('No se pudieron cargar los registros', err.error?.error ?? err.message);
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  // ─── Modal gestión de usuarios ──────────────────────────────
  openUsers(): void {
    this.userService.getAll().subscribe({
      next: (users) => this.renderUsersModal(users),
      error: (err) => this.showError('Error al cargar usuarios', err.error?.error ?? err.message),
    });
  }

  private renderUsersModal(users: User[]): void {
    const rows = users
      .map((u) => {
        const roles = u.roles
          .map(
            (r) => `
        <span style="
          display:inline-block;padding:1px 8px;border-radius:20px;
          font-size:11px;font-weight:600;margin:1px;
          background:${r.name === 'admin' ? '#534AB7' : r.name === 'manager' ? '#0F6E56' : '#444441'};
          color:${r.name === 'admin' ? '#EEEDFE' : r.name === 'manager' ? '#E1F5EE' : '#F1EFE8'}
        ">${r.name}</span>
      `,
          )
          .join('');

        const isAdmin = u.roles.some((r) => r.name === 'admin');
        const canToggle = !(u.is_active && isAdmin);

        return `
        <tr style="border-bottom:1px solid #f0f0f0;opacity:${u.is_active ? '1' : '0.55'}">
          <td style="padding:10px 8px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="
                width:32px;height:32px;min-width:32px;border-radius:50%;
                background:${u.is_active ? '#010f2d' : '#94A3B8'};
                color:#fff;font-size:13px;font-weight:700;
                display:flex;align-items:center;justify-content:center
              ">${u.username.charAt(0).toUpperCase()}</div>
              <span style="font-weight:500;font-size:13px">${u.username}</span>
            </div>
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#666">${u.email}</td>
          <td style="padding:10px 8px">${roles || '—'}</td>
          <td style="padding:10px 8px">
            <span style="
              display:inline-block;padding:2px 10px;border-radius:20px;
              font-size:11px;font-weight:600;
              background:${u.is_active ? '#E1F5EE' : '#FCEBEB'};
              color:${u.is_active ? '#0F6E56' : '#E24B4A'}
            ">${u.is_active ? 'Activo' : 'Inactivo'}</span>
          </td>
          <td style="padding:10px 8px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="swal-action-btn swal-btn-view"
                      data-id="${u.id}" data-action="view">
                👁 Ver
              </button>
              <button class="swal-action-btn swal-btn-role"
                      data-id="${u.id}" data-action="role">
                🛡 Rol
              </button>
              <button class="swal-action-btn ${u.is_active ? 'swal-btn-danger' : 'swal-btn-success'}"
                      data-id="${u.id}"
                      data-action="toggle"
                      ${!canToggle ? 'disabled title="No se puede desactivar un administrador"' : ''}>
                ${u.is_active ? '🚫 Desactivar' : '✅ Activar'}
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    Swal.fire({
      title: 'Gestión de usuarios',
      html: `
        <style>
          .swal-action-btn {
            padding:5px 10px;border-radius:6px;font-size:11px;
            font-weight:600;cursor:pointer;border:1px solid transparent;
            transition:opacity .15s
          }
          .swal-action-btn:disabled { opacity:.35; cursor:not-allowed }
          .swal-btn-view    { background:#E6F1FB;color:#185FA5;border-color:#B5D4F4 }
          .swal-btn-role    { background:#E1F5EE;color:#0F6E56;border-color:#9FE1CB }
          .swal-btn-danger  { background:#FCEBEB;color:#E24B4A;border-color:#F7C1C1 }
          .swal-btn-success { background:#E1F5EE;color:#0F6E56;border-color:#9FE1CB }
          .swal-users-table { width:100%;border-collapse:collapse;font-size:13px }
          .swal-users-table th {
            padding:8px;font-size:11px;font-weight:600;color:#888;
            text-transform:uppercase;letter-spacing:.4px;
            background:#f8f9fa;border-bottom:1px solid #eee;text-align:left
          }
        </style>
        <div style="overflow-x:auto">
          <table class="swal-users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `,
      width: 900,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        container?.addEventListener('click', (e) => {
          const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
          if (!btn || btn.hasAttribute('disabled')) return;

          const userId = Number(btn.dataset['id']);
          const action = btn.dataset['action'];
          const user = users.find((u) => u.id === userId);
          if (!user) return;

          Swal.close();

          setTimeout(() => {
            if (action === 'view') this.viewUser(user, () => this.openUsers());
            if (action === 'role') this.assignRole(user, () => this.openUsers());
            if (action === 'toggle') this.toggleActivation(user, () => this.openUsers());
          }, 200);
        });
      },
    });
  }

  // ─── Ver detalle ────────────────────────────────────────────
  viewUser(user: User, onBack?: () => void): void {
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
            <td style="padding:8px 0">
              ${new Date(user.created_at).toLocaleString('es-MX')}
            </td>
          </tr>
        </table>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button id="btn-role" style="
            padding:8px 16px;border-radius:8px;border:1px solid #9FE1CB;
            background:#E1F5EE;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer
          ">🛡 Asignar rol</button>
          <button id="btn-toggle"
            ${!canToggle ? 'disabled' : ''}
            style="
              padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;
              border:1px solid ${user.is_active ? '#F7C1C1' : '#9FE1CB'};
              background:${user.is_active ? '#FCEBEB' : '#E1F5EE'};
              color:${user.is_active ? '#E24B4A' : '#0F6E56'};
              opacity:${!canToggle ? '0.4' : '1'};
              cursor:${!canToggle ? 'not-allowed' : 'pointer'}
          ">${user.is_active ? '🚫 Desactivar' : '✅ Activar'}</button>
        </div>
        ${
          isAdmin && user.is_active
            ? `
          <p style="font-size:12px;color:#E24B4A;margin-top:12px;text-align:center">
            ⚠️ No se puede desactivar un usuario administrador
          </p>`
            : ''
        }
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: 480,
      didOpen: () => {
        document.getElementById('btn-role')?.addEventListener('click', () => {
          Swal.close();
          setTimeout(() => this.assignRole(user, onBack), 200);
        });
        document.getElementById('btn-toggle')?.addEventListener('click', () => {
          if (!canToggle) return;
          Swal.close();
          setTimeout(() => this.toggleActivation(user, onBack), 200);
        });
      },
    });
  }

  // ─── Asignar rol ────────────────────────────────────────────
  assignRole(user: User, onBack?: () => void): void {
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
          font-size:14px;outline:none
        ">
          <option value="user">user</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#010f2d',
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
          }).then(() => onBack?.());
          this.loadStats();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error al asignar rol',
            text: err.error?.error ?? err.message,
            confirmButtonColor: '#010f2d',
          }),
      });
    });
  }

  // ─── Activar / Desactivar ───────────────────────────────────
  toggleActivation(user: User, onBack?: () => void): void {
    if (user.is_active && user.roles.some((r) => r.name === 'admin')) {
      Swal.fire({
        icon: 'error',
        title: 'Acción no permitida',
        text: 'No se puede desactivar a un usuario administrador.',
        confirmButtonColor: '#010f2d',
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
      confirmButtonColor: activating ? '#010f2d' : '#E24B4A',
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
          }).then(() => onBack?.());
          this.loadStats();
        },
        error: (err) =>
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.error ?? err.message,
            confirmButtonColor: '#010f2d',
          }),
      });
    });
  }

  // ─── Modal registros de auditoría ───────────────────────────
  openAuditLogs(page: number = 1): void {
    this.userService.getAuditLogs().subscribe({
      next: (logs) => this.renderAuditModal(logs, page),
      error: (err) => this.showError('Error al cargar registros', err.error?.error ?? err.message),
    });
  }

  private renderAuditModal(allLogs: AuditLog[], page: number): void {
    const pageSize = 10;
    const total = allLogs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const logs = allLogs.slice(start, start + pageSize);

    const actionColors: Record<string, { bg: string; color: string }> = {
      LOGIN: { bg: '#E6F1FB', color: '#185FA5' },
      REGISTER: { bg: '#E1F5EE', color: '#0F6E56' },
      ASSIGN_ROLE: { bg: '#EEEDFE', color: '#3C3489' },
      PASSWORD_RESET_REQUEST: { bg: '#FAEEDA', color: '#633806' },
      PASSWORD_RESET: { bg: '#FAEEDA', color: '#633806' },
      DEFAULT: { bg: '#F1EFE8', color: '#444441' },
    };

    const getColor = (action: string) => actionColors[action] ?? actionColors['DEFAULT'];

    const rows = logs
      .map((log) => {
        const c = getColor(log.action);
        return `
        <tr class="swal-log-row" data-id="${log.id}" style="cursor:pointer;border-bottom:1px solid #f0f0f0">
          <td style="padding:10px 8px">
            <span style="
              display:inline-block;padding:2px 10px;border-radius:20px;
              font-size:11px;font-weight:600;white-space:nowrap;
              background:${c.bg};color:${c.color}
            ">${this.getActionIcon(log.action)} ${log.action}</span>
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#666">
            ${log.resource ?? '—'}
          </td>
          <td style="padding:10px 8px;font-size:12px;font-family:monospace;color:#888">
            ${log.ip_address ?? '—'}
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#888;white-space:nowrap">
            ${this.formatDate(log.created_at)}
          </td>
          <td style="padding:10px 8px;font-size:12px;color:#010f2d;font-weight:600">
            Ver →
          </td>
        </tr>
      `;
      })
      .join('');

    const pagination =
      totalPages > 1
        ? `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-top:16px;font-size:13px;color:#888">
        <span>${total} registros en total</span>
        <div style="display:flex;align-items:center;gap:8px">
          <button id="pg-prev"
            ${page <= 1 ? 'disabled' : ''}
            style="
              padding:5px 12px;border-radius:6px;border:1px solid #ddd;
              background:${page <= 1 ? '#f5f5f5' : '#fff'};
              color:${page <= 1 ? '#bbb' : '#333'};
              cursor:${page <= 1 ? 'not-allowed' : 'pointer'};font-size:13px
            ">← Anterior</button>
          <span style="font-weight:500;color:#333">${page} / ${totalPages}</span>
          <button id="pg-next"
            ${page >= totalPages ? 'disabled' : ''}
            style="
              padding:5px 12px;border-radius:6px;border:1px solid #ddd;
              background:${page >= totalPages ? '#f5f5f5' : '#fff'};
              color:${page >= totalPages ? '#bbb' : '#333'};
              cursor:${page >= totalPages ? 'not-allowed' : 'pointer'};font-size:13px
            ">Siguiente →</button>
        </div>
      </div>
    `
        : `<div style="margin-top:12px;font-size:13px;color:#888">${total} registros en total</div>`;

    Swal.fire({
      title: '📋 Registros de auditoría',
      html: `
        <style>
          .swal-log-row:hover { background:#f8f9fa }
          .swal-logs-table { width:100%;border-collapse:collapse;font-size:13px }
          .swal-logs-table th {
            padding:8px;font-size:11px;font-weight:600;color:#888;
            text-transform:uppercase;letter-spacing:.4px;
            background:#f8f9fa;border-bottom:1px solid #eee;text-align:left
          }
          #log-filter {
            width:100%;height:36px;padding:0 12px;margin-bottom:12px;
            border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none
          }
        </style>

        <input id="log-filter" type="text" placeholder="🔍 Filtrar por acción, recurso o IP…" />

        <div style="overflow-x:auto">
          <table class="swal-logs-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Recurso</th>
                <th>IP</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="logs-tbody">${rows}</tbody>
          </table>
        </div>
        ${pagination}
      `,
      width: 860,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();

        container?.addEventListener('click', (e) => {
          const row = (e.target as HTMLElement).closest('.swal-log-row') as HTMLElement;
          const pgPrev = (e.target as HTMLElement).closest('#pg-prev');
          const pgNext = (e.target as HTMLElement).closest('#pg-next');

          if (pgPrev && page > 1) {
            Swal.close();
            setTimeout(() => this.openAuditLogs(page - 1), 200);
            return;
          }
          if (pgNext && page < totalPages) {
            Swal.close();
            setTimeout(() => this.openAuditLogs(page + 1), 200);
            return;
          }

          if (!row) return;
          const logId = Number(row.dataset['id']);
          const log = allLogs.find((l) => l.id === logId);
          if (!log) return;

          Swal.close();
          setTimeout(() => this.showLogDetail(log, () => this.openAuditLogs(page)), 200);
        });

        const input = document.getElementById('log-filter') as HTMLInputElement;
        const tbody = document.getElementById('logs-tbody');
        input?.addEventListener('input', () => {
          const q = input.value.toLowerCase();
          tbody?.querySelectorAll<HTMLTableRowElement>('.swal-log-row').forEach((row) => {
            row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      },
    });
  }

  // ─── Detalle de log ─────────────────────────────────────────
  showLogDetail(log: AuditLog, onBack?: () => void): void {
    Swal.fire({
      title: `${this.getActionIcon(log.action)} ${log.action}`,
      html: `
        <table style="width:100%;text-align:left;font-size:14px;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;color:#888;width:120px">Recurso</td>
            <td style="padding:8px 0;font-weight:500">${log.resource ?? '—'}</td>
          </tr>
          <tr style="border-top:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#888">IP</td>
            <td style="padding:8px 0;font-family:monospace">${log.ip_address ?? '—'}</td>
          </tr>
          <tr style="border-top:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#888">Fecha</td>
            <td style="padding:8px 0">${this.formatDate(log.created_at)}</td>
          </tr>
          <tr style="border-top:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#888">Detalles</td>
            <td style="padding:8px 0">${log.details ?? '—'}</td>
          </tr>
          <tr style="border-top:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#888">Usuario ID</td>
            <td style="padding:8px 0">${log.user_id ?? '—'}</td>
          </tr>
        </table>
      `,
      showConfirmButton: !!onBack,
      confirmButtonText: onBack ? '← Volver al listado' : 'Cerrar',
      confirmButtonColor: '#010f2d',
      showCloseButton: true,
      width: 480,
    }).then((result) => {
      if (result.isConfirmed && onBack) onBack();
    });
  }

  // ─── Logout ─────────────────────────────────────────────────
  confirmLogout(): void {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se cerrará tu sesión actual.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E24B4A',
      cancelButtonColor: '#888780',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Sesión cerrada',
          text: 'Hasta luego.',
          timer: 1200,
          showConfirmButton: false,
          timerProgressBar: true,
        }).then(() => this.auth.logout());
      }
    });
  }

  // ─── Helpers ────────────────────────────────────────────────
  private showError(title: string, message: string): void {
    Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#010f2d',
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

  getActionIcon(action: string): string {
    const map: Record<string, string> = {
      LOGIN: '🔐',
      REGISTER: '👤',
      ASSIGN_ROLE: '🛡️',
      PASSWORD_RESET_REQUEST: '📧',
      PASSWORD_RESET: '🔑',
      DEFAULT: '📋',
    };
    return map[action] ?? map['DEFAULT'];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Perfil de usuario ───────────────────────────────────────
  openMyProfile(): void {
    this.userService.getMyProfile().subscribe({
      next: (user) => this.renderProfileModal(user),
      error: (err) => this.showError('Error al cargar perfil', err.error?.error ?? err.message),
    });
  }

  private renderProfileModal(user: User): void {
    this.userService.getMyActivity().subscribe({
      next: (logs) => this.showProfileSwal(user, logs),
      error: () => this.showProfileSwal(user, []),
    });
  }

  private showProfileSwal(user: User, logs: AuditLog[]): void {
    const activityRows =
      logs.length > 0
        ? logs
            .map(
              (l) => `
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:8px;font-size:12px">
            <span style="
              display:inline-block;padding:2px 8px;border-radius:4px;
              font-size:11px;font-weight:600;
              background:#EBF2FF;color:#1A56DB
            ">${this.getActionIcon(l.action)} ${l.action}</span>
          </td>
          <td style="padding:8px;font-size:12px;color:#64748B">${l.resource ?? '—'}</td>
          <td style="padding:8px;font-size:11px;color:#94A3B8;font-family:monospace">
            ${this.formatDate(l.created_at)}
          </td>
        </tr>
      `,
            )
            .join('')
        : `<tr><td colspan="3" style="padding:24px;text-align:center;color:#94A3B8;font-size:13px">
        Sin actividad registrada
       </td></tr>`;

    Swal.fire({
      title: '',
      width: 560,
      showConfirmButton: false,
      showCloseButton: true,
      html: `
      <style>
        .profile-tabs { display:flex; border-bottom:2px solid #E2E8F0; margin-bottom:20px }
        .profile-tab  {
          flex:1; padding:10px; font-size:13px; font-weight:600;
          color:#94A3B8; cursor:pointer; border:none; background:none;
          border-bottom:2px solid transparent; margin-bottom:-2px;
          transition:color .2s, border-color .2s
        }
        .profile-tab.active { color:#1A56DB; border-bottom-color:#1A56DB }
        .profile-panel { display:none }
        .profile-panel.active { display:block }
        .profile-field {
          display:flex; flex-direction:column; gap:5px; margin-bottom:14px; text-align:left
        }
        .profile-field label {
          font-size:12px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:.4px
        }
        .profile-field input {
          height:40px; padding:0 12px; border:1px solid #E2E8F0; border-radius:8px;
          font-size:14px; outline:none; transition:border-color .2s; width:100%; box-sizing:border-box
        }
        .profile-field input:focus { border-color:#1A56DB }
        .profile-save-btn {
          width:100%; height:40px; background:#1A56DB; color:#fff;
          border:none; border-radius:8px; font-size:14px; font-weight:600;
          cursor:pointer; margin-top:4px; transition:background .2s
        }
        .profile-save-btn:hover { background:#1240A8 }
        .profile-avatar {
          width:64px; height:64px; border-radius:50%;
          background:#1A56DB; color:#fff; font-size:26px; font-weight:700;
          display:flex; align-items:center; justify-content:center;
          margin:0 auto 16px
        }
        .profile-name {
          font-size:18px; font-weight:700; color:#0F172A; margin-bottom:4px
        }
        .profile-email { font-size:13px; color:#64748B; margin-bottom:20px }
        .activity-table { width:100%; border-collapse:collapse }
        .activity-table th {
          padding:8px; font-size:11px; font-weight:700; color:#94A3B8;
          text-transform:uppercase; letter-spacing:.5px;
          background:#F8FAFC; border-bottom:1px solid #E2E8F0; text-align:left
        }
        .pwd-hint {
          font-size:11px; color:#94A3B8; margin-top:4px; text-align:left
        }
      </style>

      <!-- Avatar + nombre -->
      <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="profile-name">${user.username}</div>
      <div class="profile-email">${user.email}</div>

      <!-- Tabs -->
      <div class="profile-tabs">
        <button class="profile-tab active" data-tab="info">Información</button>
        <button class="profile-tab"        data-tab="pwd">Contraseña</button>
        <button class="profile-tab"        data-tab="activity">Actividad</button>
      </div>

      <!-- Panel: info -->
      <div class="profile-panel active" id="panel-info">
        <div class="profile-field">
          <label>Usuario</label>
          <input id="p-username" type="text" value="${user.username}" />
        </div>
        <div class="profile-field">
          <label>Email</label>
          <input id="p-email" type="email" value="${user.email}" />
        </div>
        <button class="profile-save-btn" id="btn-save-profile">Guardar cambios</button>
      </div>

      <!-- Panel: password -->
      <div class="profile-panel" id="panel-pwd">
        <div class="profile-field">
          <label>Contraseña actual</label>
          <input id="p-current" type="password" placeholder="••••••••" />
        </div>
        <div class="profile-field">
          <label>Nueva contraseña</label>
          <input id="p-new" type="password" placeholder="••••••••" />
          <span class="pwd-hint">Mínimo 8 caracteres, 1 mayúscula, 1 número</span>
        </div>
        <div class="profile-field">
          <label>Confirmar contraseña</label>
          <input id="p-confirm" type="password" placeholder="••••••••" />
        </div>
        <button class="profile-save-btn" id="btn-save-pwd">Cambiar contraseña</button>
      </div>

      <!-- Panel: actividad -->
      <div class="profile-panel" id="panel-activity">
        <div style="overflow-x:auto;max-height:260px;overflow-y:auto">
          <table class="activity-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Recurso</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>${activityRows}</tbody>
          </table>
        </div>
      </div>
    `,
      didOpen: () => {
        // ── Tabs ──────────────────────────────────────────────
        document.querySelectorAll('.profile-tab').forEach((tab) => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach((t) => t.classList.remove('active'));
            document
              .querySelectorAll('.profile-panel')
              .forEach((p) => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = `panel-${(tab as HTMLElement).dataset['tab']}`;
            document.getElementById(panelId)?.classList.add('active');
          });
        });

        // ── Guardar perfil ────────────────────────────────────
        document.getElementById('btn-save-profile')?.addEventListener('click', () => {
          const username = (document.getElementById('p-username') as HTMLInputElement).value.trim();
          const email = (document.getElementById('p-email') as HTMLInputElement).value.trim();

          if (!username || !email) {
            Swal.showValidationMessage('Completa todos los campos');
            return;
          }

          this.userService.updateMyProfile({ username, email }).subscribe({
            next: (updatedUser) => {
              // Actualizar signal del usuario actual si es posible
              this.auth.currentUser.set(updatedUser);
              Swal.fire({
                icon: 'success',
                title: 'Perfil actualizado',
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
              }).then(() => this.openMyProfile());
            },
            error: (err) =>
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.error?.error ?? err.message,
                confirmButtonColor: '#1A56DB',
              }),
          });
        });

        // ── Cambiar contraseña ────────────────────────────────
        document.getElementById('btn-save-pwd')?.addEventListener('click', () => {
          const current_password = (document.getElementById('p-current') as HTMLInputElement).value;
          const new_password = (document.getElementById('p-new') as HTMLInputElement).value;
          const confirm_password = (document.getElementById('p-confirm') as HTMLInputElement).value;

          if (!current_password || !new_password || !confirm_password) {
            Swal.fire({
              icon: 'warning',
              title: 'Completa todos los campos',
              confirmButtonColor: '#1A56DB',
            });
            return;
          }

          this.userService
            .changeMyPassword({ current_password, new_password, confirm_password })
            .subscribe({
              next: () =>
                Swal.fire({
                  icon: 'success',
                  title: 'Contraseña actualizada',
                  timer: 1600,
                  showConfirmButton: false,
                  timerProgressBar: true,
                }),
              error: (err) =>
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: err.error?.error ?? err.message,
                  confirmButtonColor: '#1A56DB',
                }),
            });
        });
      },
    });
  }

  // ─── Panel manager ───────────────────────────────────────────
  openManagerPanel(): void {
    this.userService.getStats().subscribe({
      next: (stats) => this.renderManagerModal(stats),
      error: (err) =>
        this.showError('Error al cargar estadísticas', err.error?.error ?? err.message),
    });
  }

  private renderManagerModal(stats: any): void {
    const topActionsRows = stats.top_actions
      .map(
        (a: any) => `
    <tr style="border-bottom:1px solid #F1F5F9">
      <td style="padding:8px 12px;font-size:13px">
        ${this.getActionIcon(a.action)}
        <span style="margin-left:6px;font-weight:500">${a.action}</span>
      </td>
      <td style="padding:8px 12px;text-align:right">
        <span style="
          display:inline-block;background:#EBF2FF;color:#1A56DB;
          padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700
        ">${a.count}</span>
      </td>
    </tr>
  `,
      )
      .join('');

    Swal.fire({
      title: '',
      width: 600,
      showConfirmButton: false,
      showCloseButton: true,
      html: `
      <style>
        .mgr-tabs { display:flex; border-bottom:2px solid #E2E8F0; margin-bottom:20px }
        .mgr-tab {
          flex:1; padding:10px; font-size:13px; font-weight:600;
          color:#94A3B8; cursor:pointer; border:none; background:none;
          border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .2s
        }
        .mgr-tab.active { color:#1A56DB; border-bottom-color:#1A56DB }
        .mgr-panel { display:none }
        .mgr-panel.active { display:block }

        .mgr-stat-grid {
          display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:20px
        }
        .mgr-stat {
          background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px;
          padding:16px; text-align:left; border-left:4px solid #1A56DB
        }
        .mgr-stat__num   { font-size:28px; font-weight:700; color:#1A56DB; line-height:1 }
        .mgr-stat__label { font-size:12px; color:#94A3B8; margin-top:4px }
        .mgr-stat--green { border-left-color:#16A34A }
        .mgr-stat--green .mgr-stat__num { color:#16A34A }
        .mgr-stat--red   { border-left-color:#DC2626 }
        .mgr-stat--red   .mgr-stat__num { color:#DC2626 }
        .mgr-stat--amber { border-left-color:#D97706 }
        .mgr-stat--amber .mgr-stat__num { color:#D97706 }

        .mgr-filter-row {
          display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px
        }
        .mgr-filter-row input, .mgr-filter-row select {
          height:36px; padding:0 10px; border:1px solid #E2E8F0; border-radius:8px;
          font-size:13px; outline:none; width:100%; box-sizing:border-box
        }
        .mgr-filter-row input:focus, .mgr-filter-row select:focus { border-color:#1A56DB }
        .mgr-btn {
          height:36px; padding:0 16px; border-radius:8px; font-size:13px;
          font-weight:600; cursor:pointer; border:none; transition:background .2s
        }
        .mgr-btn--blue  { background:#1A56DB; color:#fff }
        .mgr-btn--blue:hover { background:#1240A8 }
        .mgr-btn--green { background:#DCFCE7; color:#16A34A; border:1px solid #BBF7D0 }
        .mgr-btn--green:hover { background:#BBF7D0 }
        .mgr-btn--green { display:inline-flex; align-items:center; }
        .mgr-logs-table { width:100%; border-collapse:collapse; font-size:13px }
        .mgr-logs-table th {
          padding:8px 10px; font-size:11px; font-weight:700; color:#94A3B8;
          text-transform:uppercase; letter-spacing:.5px;
          background:#F8FAFC; border-bottom:1px solid #E2E8F0; text-align:left
        }
        .mgr-logs-table td { padding:9px 10px; border-bottom:1px solid #F1F5F9 }
        .mgr-logs-table tr:last-child td { border-bottom:none }
        .mgr-top-table { width:100%; border-collapse:collapse }
      </style>

      <h2 style="font-size:18px;font-weight:700;color:#0F172A;margin:0 0 4px;text-align:left">
        Panel de reportes
      </h2>
      <p style="font-size:13px;color:#94A3B8;margin:0 0 20px;text-align:left">
        Resumen y análisis de actividad del sistema
      </p>

      <!-- Tabs -->
      <div class="mgr-tabs">
        <button class="mgr-tab active" data-tab="stats">Estadísticas</button>
        <button class="mgr-tab"        data-tab="logs">Registros</button>
        <button class="mgr-tab"        data-tab="export">Exportar</button>
      </div>

      <!-- Panel: estadísticas -->
      <div class="mgr-panel active" id="mgr-panel-stats">
        <div class="mgr-stat-grid">
          <div class="mgr-stat">
            <div class="mgr-stat__num">${stats.total}</div>
            <div class="mgr-stat__label">Usuarios totales</div>
          </div>
          <div class="mgr-stat mgr-stat--green">
            <div class="mgr-stat__num">${stats.active}</div>
            <div class="mgr-stat__label">Usuarios activos</div>
          </div>
          <div class="mgr-stat mgr-stat--red">
            <div class="mgr-stat__num">${stats.inactive}</div>
            <div class="mgr-stat__label">Usuarios inactivos</div>
          </div>
          <div class="mgr-stat mgr-stat--amber">
            <div class="mgr-stat__num">${stats.new_users}</div>
            <div class="mgr-stat__label">Nuevos (últimos 7 días)</div>
          </div>
        </div>

        <p style="font-size:12px;font-weight:700;color:#94A3B8;
                  text-transform:uppercase;letter-spacing:.5px;
                  margin:0 0 10px;text-align:left">
          Acciones más frecuentes
        </p>
        <table class="mgr-top-table">
          <tbody>${topActionsRows}</tbody>
        </table>
      </div>

      <!-- Panel: registros filtrados -->
      <div class="mgr-panel" id="mgr-panel-logs">
        <div class="mgr-filter-row">
          <select id="mgr-action">
            <option value="">Todas las acciones</option>
            <option value="LOGIN">LOGIN</option>
            <option value="REGISTER">REGISTER</option>
            <option value="ASSIGN_ROLE">ASSIGN_ROLE</option>
            <option value="PASSWORD_RESET_REQUEST">PASSWORD_RESET_REQUEST</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="UPDATE_PROFILE">UPDATE_PROFILE</option>
            <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
          </select>
          <input id="mgr-resource" type="text" placeholder="Recurso (ej: auth, users)" />
        </div>
        <div class="mgr-filter-row">
          <input id="mgr-date-from" type="date" />
          <input id="mgr-date-to"   type="date" />
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="mgr-btn mgr-btn--blue" id="mgr-btn-filter">Filtrar</button>
          <button class="mgr-btn" id="mgr-btn-clear"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0">
            Limpiar
          </button>
        </div>
        <div style="max-height:240px;overflow-y:auto;border:1px solid #E2E8F0;border-radius:8px">
          <table class="mgr-logs-table">
            <thead>
              <tr>
                <th>Acción</th>
                <th>Recurso</th>
                <th>IP</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody id="mgr-logs-body">
              <tr><td colspan="4" style="text-align:center;padding:24px;color:#94A3B8">
                Aplica los filtros para ver registros
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Panel: exportar -->
      <div class="mgr-panel" id="mgr-panel-export">
        <div style="display:flex;flex-direction:column;gap:14px;padding:8px 0">

          <div style="
            display:flex;align-items:center;justify-content:space-between;
            background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px
          ">
            <div style="text-align:left">
              <div style="font-size:14px;font-weight:600;color:#0F172A;margin-bottom:3px">
                Listado de usuarios
              </div>
              <div style="font-size:12px;color:#94A3B8">
                ID, username, email, estado, roles, fecha de registro
              </div>
            </div>
            <button class="mgr-btn mgr-btn--green" id="btn-export-users" title="Descargar CSV usuarios"
              style="width:44px;height:44px;padding:0;justify-content:center;border-radius:8px;
                    flex-direction:column;gap:1px;background:#DCFCE7;border:1px solid #BBF7D0">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#16A34A" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
              </svg>
              <span style="font-size:8px;font-weight:800;color:#16A34A;letter-spacing:.5px;line-height:1;
                          background:#16A34A;color:#fff;padding:1px 4px;border-radius:2px">CSV</span>
            </button>
          </div>

          <div style="
            display:flex;align-items:center;justify-content:space-between;
            background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px
          ">
            <div style="text-align:left">
              <div style="font-size:14px;font-weight:600;color:#0F172A;margin-bottom:3px">
                Registros de auditoría
              </div>
              <div style="font-size:12px;color:#94A3B8">
                Todas las acciones registradas en el sistema
              </div>
            </div>
            <button class="mgr-btn mgr-btn--green" id="btn-export-users" title="Descargar CSV usuarios"
              style="width:44px;height:44px;padding:0;justify-content:center;border-radius:8px;
                    flex-direction:column;gap:1px;background:#DCFCE7;border:1px solid #BBF7D0">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#16A34A" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
              </svg>
              <span style="font-size:8px;font-weight:800;color:#16A34A;letter-spacing:.5px;line-height:1;
                          background:#16A34A;color:#fff;padding:1px 4px;border-radius:2px">CSV</span>
            </button>
          </div>

        </div>
      </div>
    `,
      didOpen: () => {
        // ── Tabs ──────────────────────────────────────────────
        document.querySelectorAll('.mgr-tab').forEach((tab) => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('.mgr-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.mgr-panel').forEach((p) => p.classList.remove('active'));
            tab.classList.add('active');
            const id = `mgr-panel-${(tab as HTMLElement).dataset['tab']}`;
            document.getElementById(id)?.classList.add('active');
          });
        });

        // ── Filtrar logs ──────────────────────────────────────
        const applyFilter = () => {
          const filters = {
            action: (document.getElementById('mgr-action') as HTMLSelectElement).value,
            resource: (document.getElementById('mgr-resource') as HTMLInputElement).value,
            date_from: (document.getElementById('mgr-date-from') as HTMLInputElement).value,
            date_to: (document.getElementById('mgr-date-to') as HTMLInputElement).value,
          };

          this.userService.getFilteredLogs(filters).subscribe({
            next: (logs) => {
              const tbody = document.getElementById('mgr-logs-body');
              if (!tbody) return;
              if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4"
                style="text-align:center;padding:24px;color:#94A3B8;font-size:13px">
                Sin resultados</td></tr>`;
                return;
              }
              tbody.innerHTML = logs
                .map(
                  (l) => `
              <tr>
                <td style="font-size:12px">
                  <span style="
                    display:inline-block;padding:2px 8px;border-radius:4px;
                    background:#EBF2FF;color:#1A56DB;font-weight:600;font-size:11px
                  ">${this.getActionIcon(l.action)} ${l.action}</span>
                </td>
                <td style="font-size:12px;color:#475569">${l.resource ?? '—'}</td>
                <td style="font-size:11px;color:#94A3B8;font-family:monospace">
                  ${l.ip_address ?? '—'}
                </td>
                <td style="font-size:11px;color:#94A3B8;white-space:nowrap">
                  ${this.formatDate(l.created_at)}
                </td>
              </tr>
            `,
                )
                .join('');
            },
            error: (err) => this.showError('Error al filtrar', err.error?.error ?? err.message),
          });
        };

        document.getElementById('mgr-btn-filter')?.addEventListener('click', applyFilter);

        document.getElementById('mgr-btn-clear')?.addEventListener('click', () => {
          (document.getElementById('mgr-action') as HTMLSelectElement).value = '';
          (document.getElementById('mgr-resource') as HTMLInputElement).value = '';
          (document.getElementById('mgr-date-from') as HTMLInputElement).value = '';
          (document.getElementById('mgr-date-to') as HTMLInputElement).value = '';
          const tbody = document.getElementById('mgr-logs-body');
          if (tbody)
            tbody.innerHTML = `<tr><td colspan="4"
          style="text-align:center;padding:24px;color:#94A3B8">
          Aplica los filtros para ver registros</td></tr>`;
        });

        // ── Exportar ──────────────────────────────────────────
        document.getElementById('btn-export-users')?.addEventListener('click', () => {
          this.userService.exportUsersCSV();
        });
        document.getElementById('btn-export-logs')?.addEventListener('click', () => {
          this.userService.exportLogsCSV();
        });
      },
    });
  }
}
