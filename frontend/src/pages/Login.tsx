import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import PageContainer from '../components/ui/PageContainer';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/toilets');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer size="auth">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-600">Welcome back to CleanConnect.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-700">
          No account?{' '}
          <Link to="/register" className="link">
            Register
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}

export default Login;
