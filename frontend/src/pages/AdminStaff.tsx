import { FormEvent, useEffect, useState } from 'react';
import { createStaffAccount, listStaff } from '../api/staff';
import { PublicUser } from '../api/auth';
import Alert from '../components/ui/Alert';
import Field from '../components/ui/Field';
import { UsersIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, LoadingState } from '../components/ui/States';

function AdminStaff() {
  const [staff, setStaff] = useState<PublicUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listStaff()
      .then(setStaff)
      .catch(() => setError('Could not load staff accounts.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createStaffAccount({ name, email, password });
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      load();
    } catch {
      setFormError('Could not create the staff account. That email may already be in use.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Staff Management"
        subtitle="Staff accounts can be assigned maintenance tasks. Only administrators can create them."
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
            className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showForm ? 'Cancel' : 'Create Staff Account'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">New staff account</h2>
          <Field label="Name">
            <input
              id="name"
              type="text"
              autoComplete="off"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              id="email"
              type="email"
              autoComplete="off"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password (min 8 characters)">
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          {formError && <Alert tone="error">{formError}</Alert>}
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Creating…' : 'Create Staff Account'}
          </button>
        </form>
      )}

      {loading && <LoadingState label="Loading staff…" />}
      {error && <Alert tone="error">{error}</Alert>}

      {staff && staff.length === 0 && (
        <EmptyState
          icon={<UsersIcon className="h-5 w-5" />}
          title="No staff accounts yet."
          description="Create one so complaints can be assigned to maintenance staff."
        />
      )}

      {staff && staff.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {staff.map((member) => (
            <li key={member.id} className="card p-4">
              <p className="font-semibold text-slate-900">{member.name}</p>
              <p className="break-all text-sm text-slate-700">{member.email}</p>
              <p className="mt-1 text-xs text-slate-600">
                Joined {new Date(member.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

export default AdminStaff;
