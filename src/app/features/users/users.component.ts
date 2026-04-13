import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { HttpClient }        from '@angular/common/http';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h2>Gestión de usuarios</h2>
      <table *ngIf="users.length">
        <thead>
          <tr><th>ID</th><th>Username</th><th>Email</th>
              <th>Roles</th><th>Activo</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.roles | json }}</td>
            <td>{{ u.is_active ? 'Sí' : 'No' }}</td>
            <td>
              <button (click)="assignRole(u.id, 'manager')">→ Manager</button>
              <button (click)="deactivate(u.id)">Desactivar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  private readonly API = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<User[]>(`${this.API}/users/`).subscribe(u => this.users = u);
  }

  assignRole(userId: number, role: string) {
    this.http.put(`${this.API}/users/${userId}/role`, { role })
      .subscribe(() => this.ngOnInit());
  }

  deactivate(userId: number) {
    this.http.put(`${this.API}/users/${userId}/deactivate`, {})
      .subscribe(() => this.ngOnInit());
  }
}
