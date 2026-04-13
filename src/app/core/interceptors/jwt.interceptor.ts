import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject }        from '@angular/core';
import { Router }        from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService }   from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Rutas que NO necesitan token (no agregar Authorization header)
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];

  const isPublic = publicRoutes.some(route => req.url.includes(route));

  // Si es ruta pública, dejar pasar sin modificar
  if (isPublic) {
    return next(req);
  }

  // Clonar la request agregando el token en el header
  const token = auth.getToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // Si el servidor responde 401 (token expirado o inválido)
      if (error.status === 401) {

        // Intentar renovar con el refresh token
        return auth.refreshToken().pipe(
          switchMap(res => {
            // Reintentar la request original con el nuevo access token
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access_token}`
              }
            });
            return next(retryReq);
          }),
          catchError(refreshError => {
            // Si el refresh también falla, cerrar sesión y redirigir al login
            auth.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }

      // Si es 403 (sin permisos), redirigir al dashboard
      if (error.status === 403) {
        router.navigate(['/dashboard']);
      }

      return throwError(() => error);
    })
  );
};
