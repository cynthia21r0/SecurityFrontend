import { Component, OnInit, WritableSignal, signal, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { RouterLink }            from '@angular/router';
import { AuthService }           from '../../core/services/auth.service';
import { UserService, AuditLog } from '../../core/services/user.service';
import { User }                  from '../../models/user.model';
import Swal                      from 'sweetalert2';

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl:    './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  protected auth      = inject(AuthService);
  private userService = inject(UserService);

  currentUser: WritableSignal<User | null> = this.auth.currentUser;

  totalUsers  = signal<number>(0);
  activeUsers = signal<number>(0);
  recentLogs  = signal<AuditLog[]>([]);
  loading     = signal<boolean>(true);
  error       = signal<string>('');

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
        this.activeUsers.set(users.filter(u => u.is_active).length);
      },
      error: err => {
        this.showError('No se pudieron cargar los usuarios', err.error?.error ?? err.message);
        this.loading.set(false);
      }
    });

    if (this.auth.hasRole('admin')) {
      this.userService.getAuditLogs().subscribe({
        next: logs => {
          this.recentLogs.set(logs.slice(0, 5));
          this.loading.set(false);
        },
        error: err => {
          this.showError('No se pudieron cargar los registros', err.error?.error ?? err.message);
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  // ─── Modal gestión de usuarios ──────────────────────────────
  openUsers(): void {
    this.userService.getAll().subscribe({
      next:  users => this.renderUsersModal(users),
      error: err   => this.showError('Error al cargar usuarios', err.error?.error ?? err.message)
    });
  }

  private renderUsersModal(users: User[]): void {
    const rows = users.map(u => {
      const roles = u.roles.map(r => `
        <span style="
          display:inline-block;padding:1px 8px;border-radius:20px;
          font-size:11px;font-weight:600;margin:1px;
          background:${r.name === 'admin' ? '#534AB7' : r.name === 'manager' ? '#0F6E56' : '#444441'};
          color:${r.name === 'admin' ? '#EEEDFE' : r.name === 'manager' ? '#E1F5EE' : '#F1EFE8'}
        ">${r.name}</span>
      `).join('');

      const isAdmin   = u.roles.some(r => r.name === 'admin');
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
    }).join('');

    Swal.fire({
      title:             'Gestión de usuarios',
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
      width:             900,
      showConfirmButton: false,
      showCloseButton:   true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        container?.addEventListener('click', (e) => {
          const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
          if (!btn || btn.hasAttribute('disabled')) return;

          const userId = Number(btn.dataset['id']);
          const action = btn.dataset['action'];
          const user   = users.find(u => u.id === userId);
          if (!user) return;

          Swal.close();

          setTimeout(() => {
            if (action === 'view')   this.viewUser(user, () => this.openUsers());
            if (action === 'role')   this.assignRole(user, () => this.openUsers());
            if (action === 'toggle') this.toggleActivation(user, () => this.openUsers());
          }, 200);
        });
      }
    });
  }

  // ─── Ver detalle ────────────────────────────────────────────
  viewUser(user: User, onBack?: () => void): void {
    const roles = user.roles.map(r => `
      <span style="
        display:inline-block;padding:2px 10px;border-radius:20px;
        font-size:11px;font-weight:600;margin:2px;
        background:${r.name === 'admin' ? '#534AB7' : r.name === 'manager' ? '#0F6E56' : '#444441'};
        color:${r.name === 'admin' ? '#EEEDFE' : r.name === 'manager' ? '#E1F5EE' : '#F1EFE8'}
      ">${r.name}</span>
    `).join('');

    const isAdmin   = user.roles.some(r => r.name === 'admin');
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
        ${isAdmin && user.is_active ? `
          <p style="font-size:12px;color:#E24B4A;margin-top:12px;text-align:center">
            ⚠️ No se puede desactivar un usuario administrador
          </p>` : ''}
      `,
      showConfirmButton: false,
      showCloseButton:   true,
      width:             480,
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
      }
    });
  }

  // ─── Asignar rol ────────────────────────────────────────────
  assignRole(user: User, onBack?: () => void): void {
    const currentRoles = user.roles.map(r => r.name);

    Swal.fire({
      title: `Asignar rol a ${user.username}`,
      html: `
        <p style="font-size:14px;color:#888;margin-bottom:16px">
          Roles actuales:
          ${currentRoles.map(r => `<strong>${r}</strong>`).join(', ') || '—'}
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
      showCancelButton:   true,
      confirmButtonText:  'Asignar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#010f2d',
      cancelButtonColor:  '#888780',
      reverseButtons:     true,
      preConfirm: () => {
        const select = document.getElementById('swal-role') as HTMLSelectElement;
        return select.value;
      }
    }).then(result => {
      if (!result.isConfirmed) return;

      this.userService.assignRole(user.id, result.value).subscribe({
        next: () => {
          Swal.fire({
            icon:              'success',
            title:             'Rol asignado',
            text:              `El rol "${result.value}" fue asignado a ${user.username}.`,
            timer:             1800,
            showConfirmButton: false,
            timerProgressBar:  true
          }).then(() => onBack?.());
          this.loadStats();
        },
        error: err => Swal.fire({
          icon:               'error',
          title:              'Error al asignar rol',
          text:               err.error?.error ?? err.message,
          confirmButtonColor: '#010f2d'
        })
      });
    });
  }

  // ─── Activar / Desactivar ───────────────────────────────────
  toggleActivation(user: User, onBack?: () => void): void {
    if (user.is_active && user.roles.some(r => r.name === 'admin')) {
      Swal.fire({
        icon:               'error',
        title:              'Acción no permitida',
        text:               'No se puede desactivar a un usuario administrador.',
        confirmButtonColor: '#010f2d'
      });
      return;
    }

    const activating = !user.is_active;

    Swal.fire({
      title:              activating ? `¿Activar a ${user.username}?`
                                     : `¿Desactivar a ${user.username}?`,
      text:               activating ? 'El usuario podrá iniciar sesión nuevamente.'
                                     : 'El usuario no podrá iniciar sesión.',
      icon:               activating ? 'question' : 'warning',
      showCancelButton:   true,
      confirmButtonText:  activating ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: activating ? '#010f2d' : '#E24B4A',
      cancelButtonColor:  '#888780',
      reverseButtons:     true
    }).then(result => {
      if (!result.isConfirmed) return;

      const request$ = activating
        ? this.userService.activate(user.id)
        : this.userService.deactivate(user.id);

      request$.subscribe({
        next: () => {
          Swal.fire({
            icon:              'success',
            title:             activating ? 'Usuario activado' : 'Usuario desactivado',
            text:              `${user.username} fue ${activating ? 'activado' : 'desactivado'} correctamente.`,
            timer:             1800,
            showConfirmButton: false,
            timerProgressBar:  true
          }).then(() => onBack?.());
          this.loadStats();
        },
        error: err => Swal.fire({
          icon:               'error',
          title:              'Error',
          text:               err.error?.error ?? err.message,
          confirmButtonColor: '#010f2d'
        })
      });
    });
  }

  // ─── Modal registros de auditoría ───────────────────────────
  openAuditLogs(page: number = 1): void {
    this.userService.getAuditLogs().subscribe({
      next:  logs => this.renderAuditModal(logs, page),
      error: err  => this.showError('Error al cargar registros', err.error?.error ?? err.message)
    });
  }

  private renderAuditModal(allLogs: AuditLog[], page: number): void {
    const pageSize   = 10;
    const total      = allLogs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start      = (page - 1) * pageSize;
    const logs       = allLogs.slice(start, start + pageSize);

    const actionColors: Record<string, { bg: string; color: string }> = {
      LOGIN:                  { bg: '#E6F1FB', color: '#185FA5' },
      REGISTER:               { bg: '#E1F5EE', color: '#0F6E56' },
      ASSIGN_ROLE:            { bg: '#EEEDFE', color: '#3C3489' },
      PASSWORD_RESET_REQUEST: { bg: '#FAEEDA', color: '#633806' },
      PASSWORD_RESET:         { bg: '#FAEEDA', color: '#633806' },
      DEFAULT:                { bg: '#F1EFE8', color: '#444441' }
    };

    const getColor = (action: string) =>
      actionColors[action] ?? actionColors['DEFAULT'];

    const rows = logs.map(log => {
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
    }).join('');

    const pagination = totalPages > 1 ? `
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
    ` : `<div style="margin-top:12px;font-size:13px;color:#888">${total} registros en total</div>`;

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
      width:             860,
      showConfirmButton: false,
      showCloseButton:   true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();

        container?.addEventListener('click', (e) => {
          const row    = (e.target as HTMLElement).closest('.swal-log-row') as HTMLElement;
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
          const log   = allLogs.find(l => l.id === logId);
          if (!log) return;

          Swal.close();
          setTimeout(() => this.showLogDetail(log, () => this.openAuditLogs(page)), 200);
        });

        const input = document.getElementById('log-filter') as HTMLInputElement;
        const tbody = document.getElementById('logs-tbody');
        input?.addEventListener('input', () => {
          const q = input.value.toLowerCase();
          tbody?.querySelectorAll<HTMLTableRowElement>('.swal-log-row').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      }
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
      confirmButtonText:  onBack ? '← Volver al listado' : 'Cerrar',
      confirmButtonColor: '#010f2d',
      showCloseButton:    true,
      width:              480
    }).then(result => {
      if (result.isConfirmed && onBack) onBack();
    });
  }

  // ─── Logout ─────────────────────────────────────────────────
  confirmLogout(): void {
    Swal.fire({
      title:              '¿Cerrar sesión?',
      text:               'Se cerrará tu sesión actual.',
      icon:               'question',
      showCancelButton:   true,
      confirmButtonText:  'Sí, salir',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#E24B4A',
      cancelButtonColor:  '#888780',
      reverseButtons:     true,
      focusCancel:        true
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire({
          icon:              'success',
          title:             'Sesión cerrada',
          text:              'Hasta luego.',
          timer:             1200,
          showConfirmButton: false,
          timerProgressBar:  true
        }).then(() => this.auth.logout());
      }
    });
  }

  // ─── Helpers ────────────────────────────────────────────────
  private showError(title: string, message: string): void {
    Swal.fire({
      icon:               'error',
      title,
      text:               message,
      confirmButtonColor: '#010f2d'
    });
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      admin:   'badge badge--admin',
      manager: 'badge badge--manager',
      user:    'badge badge--user'
    };
    return map[role] ?? 'badge badge--user';
  }

  getActionIcon(action: string): string {
    const map: Record<string, string> = {
      LOGIN:                  '🔐',
      REGISTER:               '👤',
      ASSIGN_ROLE:            '🛡️',
      PASSWORD_RESET_REQUEST: '📧',
      PASSWORD_RESET:         '🔑',
      DEFAULT:                '📋'
    };
    return map[action] ?? map['DEFAULT'];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit'
    });
  }
}
