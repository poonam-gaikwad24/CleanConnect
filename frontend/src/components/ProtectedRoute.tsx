import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Role } from '../api/auth';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role;
}

function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-6 text-slate-500">Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
