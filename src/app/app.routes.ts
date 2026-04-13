import { Routes }    from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard, withRoles } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '',            redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',       loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: 'register',    loadComponent: () => import('./features/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, withRoles('admin', 'manager')],
    loadComponent: () =>
      import('./features/users/users.component')
        .then(m => m.UsersComponent)
  },
  { path: '**', redirectTo: 'login' }
];
