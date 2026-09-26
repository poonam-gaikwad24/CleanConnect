import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createToiletRequest } from '../api/toiletRequests';

const MAX_IMAGE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function ToiletRequestCreate() {
  const navigate = useNavigate();

  const [location, setLocation] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ requestCode: string } | null>(null);

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
    setError(null);
    setSubmitting(true);

    try {
      const request = await createToiletRequest({
        location,
        landmark: landmark || undefined,
        address: address || undefined,
        description: description || undefined,
        image,
      });
      setSubmitted({ requestCode: request.requestCode });
    } catch {
      setError('Could not submit the request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-800">Request submitted successfully</p>
          <p className="mt-2 text-sm text-green-700">Request ID: {submitted.requestCode}</p>
          <p className="text-sm text-green-700">
            An admin will review it. Once approved, this toilet gets its own CleanConnect ID and QR
            code and citizens can report issues against it.
          </p>
          <button
            className="mt-4 rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            onClick={() => navigate('/my-toilet-requests')}
          >
            View my requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Request Toilet Registration</h1>
      <p className="mb-4 text-sm text-slate-500">
        Can't find a toilet in our list? Tell us where it is and an admin will verify and register
        it. This does not create an official CleanConnect record directly — every request is
        reviewed first.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="location">
            Location / Area *
          </label>
          <input
            id="location"
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Near Kharadi bus stop"
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

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="address">
            Address
          </label>
          <input
            id="address"
            type="text"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Anything that helps an admin find and verify it."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="image">
            Photo (optional)
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-slate-400">
            JPEG, PNG or WEBP, up to {MAX_IMAGE_MB}MB. Helps the admin verify the toilet exists.
          </p>
          {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !location.trim()}
          className="w-full rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

export default ToiletRequestCreate;
