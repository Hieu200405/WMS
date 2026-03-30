import { Navigate, Route, Routes } from 'react-router-dom';
import { appRoutes } from './routes.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { useAuth } from './auth-context.jsx';
import { AppLayout } from './AppLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { Roles } from '../utils/constants.js';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute roles={[Roles.ADMIN]}>
            <RegisterPage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {appRoutes.map((route) => {
          const Component = route.component;
          const path = route.path.startsWith('/') ? route.path.slice(1) : route.path;
          return (
            <Route
              key={route.path}
              path={path}
              element={
                <ProtectedRoute roles={route.roles}>
                  <Component />
                </ProtectedRoute>
              }
            />
          );
        })}
      </Route>
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  );
}
