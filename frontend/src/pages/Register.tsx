import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import PageContainer from '../components/ui/PageContainer';

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Always registers as CITIZEN — the backend never accepts a
      // client-supplied role (see auth.service.ts / auth.validators.ts).
      await register(name, email, password);
      navigate('/toilets');
    } catch {
      setError('Could not register. That email may already be in use.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer size="auth">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create an account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register as a citizen to report issues and review toilets.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Name">
            <input
              type="text"
              autoComplete="name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
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
          <Field label="Password" help="Minimum 8 characters.">
            <input
              type="password"
              autoComplete="new-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
          <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-700">
          Already have an account?{' '}
          <Link to="/login" className="link">
            Log in
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}

export default Register;
