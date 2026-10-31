import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { createToilet, Toilet } from '../api/toilets';
import ToiletQrCode from '../components/ToiletQrCode';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import { CheckCircleIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';

function AdminToiletCreate() {
  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [ward, setWard] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [externalId, setExternalId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Toilet | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // cleanConnectId is never sent — the backend always generates it
      // via the same getNextCleanConnectId() used for CSV imports and
      // approved citizen requests (see toilet.service.ts#createToilet).
      // externalId is left out entirely (not even null) when blank, so
      // this toilet has no invented PMC source record.
      const toilet = await createToilet({
        location,
        landmark: landmark || null,
        ward: ward ? Number(ward) : null,
        type: type || null,
        status: status || null,
        ...(externalId ? { externalId } : {}),
      });
      setCreated(toilet);
    } catch {
      setError('Could not create the toilet. It may duplicate an existing source ID.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <PageContainer size="narrow">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Toilet created</h1>
          <p className="mt-1 text-sm text-slate-700">
            CleanConnect ID:{' '}
            <span className="font-mono font-semibold">{created.cleanConnectId ?? 'assigned shortly'}</span>
          </p>
          {created.cleanConnectId && (
            <div className="mt-4 flex justify-center">
              <ToiletQrCode cleanConnectId={created.cleanConnectId} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to={`/toilets/${created.id}`} className="btn btn-primary">
              View toilet page
            </Link>
            <Link to="/admin/toilets" className="btn btn-secondary">
              Back to Manage Toilets
            </Link>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        back={{ to: '/admin/toilets', label: 'Back to Manage Toilets' }}
        title="Add New Toilet"
        subtitle="Its CleanConnect ID (e.g. CC-PMC-0985) is generated automatically — you don't enter one."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Location</h2>
          <div className="space-y-4">
            <Field label="Location *">
              <input
                id="location"
                type="text"
                className="field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </Field>
            <Field label="Landmark">
              <input
                id="landmark"
                type="text"
                className="field"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </Field>
            <Field label="Ward">
              <input
                id="ward"
                type="number"
                min={1}
                className="field sm:w-40"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Facility details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <input
                id="type"
                type="text"
                placeholder="e.g. Community Toilet"
                className="field"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </Field>
            <Field label="Status">
              <input
                id="status"
                type="text"
                placeholder="e.g. Functional"
                className="field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Source (PMC) ID"
                help="Only fill this in if you actually know the PMC/source ID — CleanConnect never invents one."
              >
                <input
                  id="externalId"
                  type="text"
                  placeholder="Leave blank if this toilet has no official source ID"
                  className="field"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="submit"
          disabled={submitting || !location.trim()}
          className="btn btn-primary btn-block"
        >
          {submitting ? 'Creating…' : 'Create Toilet'}
        </button>
      </form>
    </PageContainer>
  );
}

export default AdminToiletCreate;
