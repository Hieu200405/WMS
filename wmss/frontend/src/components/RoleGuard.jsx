import { useAuth } from '../app/auth-context.jsx';

export function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();
  if (!roles || roles.length === 0) return children;
  if (!user) return fallback;
  if (roles.includes(user.role)) return children;
  return fallback;
}
