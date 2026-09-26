import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { createToilet, Toilet } from '../api/toilets';
import ToiletQrCode from '../components/ToiletQrCode';

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
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-800">Toilet created</p>
          <p className="mt-1 text-sm text-green-700">
            CleanConnect ID: {created.cleanConnectId ?? 'assigned shortly'}
          </p>
          {created.cleanConnectId && (
            <div className="mt-4 flex justify-center">
              <ToiletQrCode cleanConnectId={created.cleanConnectId} />
            </div>
          )}
          <div className="mt-4 flex justify-center gap-4">
            <Link to={`/toilets/${created.id}`} className="text-sm text-blue-600 hover:underline">
              View toilet page
            </Link>
            <Link to="/admin/toilets" className="text-sm text-slate-600 hover:underline">
              Back to Manage Toilets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <Link to="/admin/toilets" className="text-sm text-slate-500 hover:underline">
        ← Back to Manage Toilets
      </Link>

      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-800">Add New Toilet</h1>
      <p className="mb-4 text-sm text-slate-500">
        Its CleanConnect ID (e.g. CC-PMC-0985) is generated automatically — you don't enter one.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
            Location *
          </label>
          <input
            id="location"
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="landmark">
            Landmark
          </label>
          <input
            id="landmark"
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ward">
              Ward
            </label>
            <input
              id="ward"
              type="number"
              min={1}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="type">
              Type
            </label>
            <input
              id="type"
              type="text"
              placeholder="e.g. Community Toilet"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="status">
            Status
          </label>
          <input
            id="status"
            type="text"
            placeholder="e.g. Functional"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="externalId">
            Source (PMC) ID
          </label>
          <input
            id="externalId"
            type="text"
            placeholder="Leave blank if this toilet has no official source ID"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">
            Only fill this in if you actually know the PMC/source ID — CleanConnect never invents
            one.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !location.trim()}
          className="w-full rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Toilet'}
        </button>
      </form>
    </div>
  );
}

export default AdminToiletCreate;
