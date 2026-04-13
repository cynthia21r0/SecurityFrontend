import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from '../../models/user.model';

export interface AuditLog {
  id:         number;
  user_id:    number | null;
  action:     string;
  resource:   string | null;
  ip_address: string | null;
  details:    string | null;
  created_at: string;
}

export interface AssignRoleResponse extends User {}

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly API = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // ─── Usuarios ────────────────────────────────────────────────

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API}/users/`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.API}/users/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ─── Roles ───────────────────────────────────────────────────

  assignRole(userId: number, role: string): Observable<User> {
    return this.http.put<User>(`${this.API}/users/${userId}/role`, { role })
      .pipe(catchError(this.handleError));
  }

  removeRole(userId: number, role: string): Observable<User> {
    // Llama al mismo endpoint pero pasando el rol a quitar
    // (necesitas agregar este endpoint en Flask si lo quieres)
    return this.http.put<User>(`${this.API}/users/${userId}/remove-role`, { role })
      .pipe(catchError(this.handleError));
  }

  // ─── Activar / Desactivar ─────────────────────────────────────

  deactivate(userId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.API}/users/${userId}/deactivate`, {}
    ).pipe(catchError(this.handleError));
  }

  activate(userId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.API}/users/${userId}/activate`, {}
    ).pipe(catchError(this.handleError));
  }

  // ─── Auditoría ───────────────────────────────────────────────

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.API}/users/audit-logs`)
      .pipe(catchError(this.handleError));
  }

  getAuditLogsByUser(userId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.API}/users/audit-logs`)
      .pipe(
        map(logs => logs.filter(log => log.user_id === userId)),
        catchError(this.handleError)
      );
  }

  // ─── Manejo de errores ───────────────────────────────────────

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      message = `Error de red: ${error.error.message}`;
    } else {
      message = error.error?.error ?? error.error?.message ?? message;
    }

    return throwError(() => ({ status: error.status, message }));
  }
}
