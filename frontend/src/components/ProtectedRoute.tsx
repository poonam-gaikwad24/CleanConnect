import { Link, Navigate } from 'react-router-dom';
import Alert from './ui/Alert';
import PageContainer from './ui/PageContainer';
import { LoadingState } from './ui/States';
import { ReactNode } from 'react';
import { Role } from '../api/auth';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role;
}

function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return (
      <PageContainer size="narrow">
        <Alert tone="warning">You don't have permission to view this page.</Alert>
        <Link to="/" className="btn btn-secondary mt-4">
          Go to the home page
        </Link>
      </PageContainer>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
