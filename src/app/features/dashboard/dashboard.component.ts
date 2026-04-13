import { Component, OnInit, WritableSignal, signal, inject } from '@angular/core';
import { CommonModule }          from '@angular/common';
import { AuthService }           from '../../core/services/auth.service';
import { UserService, AuditLog } from '../../core/services/user.service';
import { User }                  from '../../models/user.model';

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl:    './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  protected auth        = inject(AuthService);
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
      error: err => this.error.set(err.message)
    });

    if (this.auth.hasRole('admin')) {
      this.userService.getAuditLogs().subscribe({
        next: logs => {
          this.recentLogs.set(logs.slice(0, 5));
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
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
