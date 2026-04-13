import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthResponse, User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = 'http://localhost:5000/api';

  // Signal reactivo — los componentes pueden leer esto directamente
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Al iniciar la app, restaurar el usuario desde localStorage si existe
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
  }

  // ─── Autenticación ───────────────────────────────────────────

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/auth/login`, { email, password })
      .pipe(
        tap(res => {
          localStorage.setItem('access_token',  res.access_token);
          localStorage.setItem('refresh_token', res.refresh_token);
          localStorage.setItem('user',          JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }),
        catchError(this.handleError)
      );
  }

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.API}/auth/register`, { username, email, password })
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<{ access_token: string }> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post<{ access_token: string }>(
      `${this.API}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } }
    ).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
      }),
      catchError(err => {
        // Si el refresh también falla, cerrar sesión
        this.logout();
        return throwError(() => err);
      })
    );
  }

  // ─── Recuperación de contraseña ──────────────────────────────

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API}/auth/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  resetPassword(token: string, new_password: string): Observable<any> {
    return this.http.post(`${this.API}/auth/reset-password`, { token, new_password })
      .pipe(catchError(this.handleError));
  }

  // ─── Perfil ──────────────────────────────────────────────────

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.API}/auth/me`)
      .pipe(
        tap(user => {
          // Actualizar el signal y localStorage con datos frescos del servidor
          this.currentUser.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        }),
        catchError(this.handleError)
      );
  }

  // ─── Helpers ─────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.some(r => r.name === role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(r => this.hasRole(r));
  }

  getUserRoles(): string[] {
    return this.currentUser()?.roles.map(r => r.name) ?? [];
  }

  // ─── Manejo de errores ───────────────────────────────────────

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente (red, etc.)
      message = `Error de red: ${error.error.message}`;
    } else {
      // Error del servidor — Flask devuelve { "error": "..." }
      message = error.error?.error ?? error.error?.message ?? message;
    }

    return throwError(() => ({ status: error.status, message }));
  }
}
