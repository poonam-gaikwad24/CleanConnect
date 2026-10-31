import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getToiletById, listToilets, Toilet } from '../api/toilets';
import { createComplaint, ComplaintCategory } from '../api/complaints';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { ALL_CATEGORIES, categoryLabel } from '../utils/complaintLabels';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import { CheckCircleIcon, ExternalLinkIcon, SearchIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';

const MAX_IMAGE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function ComplaintCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Toilet[]>([]);
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ complaintCode: string } | null>(null);

  // A toilet's Details/Listing page — or a scanned QR code, per
  // Module 6 — can deep-link here with the toilet already chosen. `toilet`
  // is the current param name (carries the human-readable cleanConnectId,
  // e.g. ?toilet=CC-PMC-0147, exactly what a QR code encodes); `toiletId`
  // is kept working too for any old links/bookmarks from before Module 6.
  // getToiletById resolves either a raw id or a cleanConnectId either way
  // (see toilet.service.ts), so no extra logic is needed here beyond
  // picking whichever param is present.
  useEffect(() => {
    const preselectId = searchParams.get('toilet') ?? searchParams.get('toiletId');
    if (!preselectId) return;

    getToiletById(preselectId)
      .then(setSelectedToilet)
      .catch(() => {
        /* Falls back to manual search below if the id is stale/invalid. */
      });
  }, [searchParams]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      listToilets({ search: search.trim(), limit: 5 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  function handleImageChange(file: File | null) {
    setImageError(null);
    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, or WEBP images are allowed.');
      setImage(null);
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`Image must be under ${MAX_IMAGE_MB}MB.`);
      setImage(null);
      return;
    }

    setImage(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedToilet) {
      setError('Please select a toilet first.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const complaint = await createComplaint({
        toiletId: selectedToilet.id,
        description,
        category,
        image,
      });
      setSubmitted({ complaintCode: complaint.complaintCode });
    } catch {
      setError('Could not submit the complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PageContainer size="narrow">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Complaint submitted successfully</h1>
          <p className="mt-2 text-sm text-slate-700">
            Complaint ID: <span className="font-mono font-semibold">{submitted.complaintCode}</span>
          </p>
          <p className="text-sm text-slate-700">Status: Pending</p>
          <button className="btn btn-primary mt-5" onClick={() => navigate('/my-complaints')}>
            View my complaints
          </button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Report an Issue"
        subtitle="Tell us what is wrong so an administrator can assign it to maintenance staff."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Toilet</h2>
          <label htmlFor="toilet-search" className="label">
            1. Select toilet
          </label>

          {selectedToilet ? (
            <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
              <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
                {selectedToilet.cleanConnectId ?? 'ID pending'}
              </p>
              <p className="font-semibold text-slate-900">{selectedToilet.location}</p>
              <p className="text-sm text-slate-700">
                {selectedToilet.ward !== null ? `Ward ${selectedToilet.ward}` : 'Ward not recorded'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={buildGoogleMapsSearchUrl(selectedToilet.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex items-center gap-1 text-sm no-underline hover:underline"
                >
                  View on Google Maps
                  <ExternalLinkIcon />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedToilet(null)}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="toilet-search"
                  type="text"
                  placeholder="Search by CleanConnect ID, address, or area…"
                  className="field pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {results.map((toilet) => (
                    <li key={toilet.id}>
                      <button
                        type="button"
                        className="block w-full p-3 text-left hover:bg-slate-50"
                        onClick={() => {
                          setSelectedToilet(toilet);
                          setResults([]);
                          setSearch('');
                        }}
                      >
                        <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
                          {toilet.cleanConnectId ?? 'ID pending'}
                        </p>
                        <p className="text-sm font-medium text-slate-900">{toilet.location}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm text-slate-700">
                Toilet not listed?{' '}
                <Link to="/toilet-requests/create" className="link">
                  Request registration
                </Link>
              </p>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Issue details</h2>
          <div className="space-y-4">
            <Field label="2. Select issue category">
              <select
                id="category"
                className="field"
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory | '')}
                required
              >
                <option value="" disabled>
                  Select a category…
                </option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="3. Describe the problem" help="At least 10 characters, up to 1000.">
              <textarea
                id="description"
                rows={4}
                className="field"
                placeholder="e.g. No water has been available since morning."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minLength={10}
                maxLength={1000}
                required
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Photo evidence</h2>
          <Field
            label="4. Photo evidence (optional)"
            error={imageError}
            help={`JPEG, PNG or WEBP, up to ${MAX_IMAGE_MB}MB. This photo is evidence for the admin reviewing your complaint — it isn't analyzed automatically.`}
          >
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm text-slate-800 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </Field>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="submit"
          disabled={submitting || !selectedToilet || !category}
          className="btn btn-primary btn-block"
        >
          {submitting ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </PageContainer>
  );
}

export default ComplaintCreate;
