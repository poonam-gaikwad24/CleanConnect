import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getToiletById, listToilets, Toilet } from '../api/toilets';
import { createComplaint, ComplaintCategory } from '../api/complaints';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import { ALL_CATEGORIES, categoryLabel } from '../utils/complaintLabels';

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
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-800">Complaint submitted successfully</p>
          <p className="mt-2 text-sm text-green-700">Complaint ID: {submitted.complaintCode}</p>
          <p className="text-sm text-green-700">Status: Pending</p>
          <button
            className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            onClick={() => navigate('/my-complaints')}
          >
            View my complaints
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Report an Issue</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">1. Select toilet</label>

          {selectedToilet ? (
            <div className="rounded border border-slate-200 bg-white p-3">
              <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                {selectedToilet.cleanConnectId ?? 'ID pending'}
              </p>
              <p className="font-medium text-slate-800">{selectedToilet.location}</p>
              <p className="text-sm text-slate-500">
                {selectedToilet.ward !== null ? `Ward ${selectedToilet.ward}` : 'Ward not recorded'}
              </p>
              <a
                href={buildGoogleMapsSearchUrl(selectedToilet.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-blue-600 hover:underline"
              >
                View on Google Maps
              </a>
              <button
                type="button"
                className="ml-3 text-sm text-slate-500 underline"
                onClick={() => setSelectedToilet(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search by CleanConnect ID, address, or area…"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-200 rounded border border-slate-200 bg-white">
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
                        <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                          {toilet.cleanConnectId ?? 'ID pending'}
                        </p>
                        <p className="text-sm font-medium text-slate-800">{toilet.location}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm text-slate-500">
                Toilet not listed?{' '}
                <Link to="/toilet-requests/create" className="text-blue-600 hover:underline">
                  Request registration
                </Link>
              </p>
            </>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="category">
            2. Select issue category
          </label>
          <select
            id="category"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
            3. Describe the problem
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. No water has been available since morning."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={10}
            maxLength={1000}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="image">
            4. Photo evidence (optional)
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-slate-400">
            JPEG, PNG or WEBP, up to {MAX_IMAGE_MB}MB. This photo is evidence for the admin
            reviewing your complaint — it isn't analyzed automatically.
          </p>
          {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !selectedToilet || !category}
          className="w-full rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit complaint'}
        </button>
      </form>
    </div>
  );
}

export default ComplaintCreate;
