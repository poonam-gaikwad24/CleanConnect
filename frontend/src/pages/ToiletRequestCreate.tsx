import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createToiletRequest } from '../api/toiletRequests';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import { CheckCircleIcon } from '../components/ui/icons';
import PageContainer from '../components/ui/PageContainer';
import PageHeader from '../components/ui/PageHeader';

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
      <PageContainer size="narrow">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Request submitted successfully</h1>
          <p className="mt-2 text-sm text-slate-700">
            Request ID: <span className="font-mono font-semibold">{submitted.requestCode}</span>
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-700">
            An admin will review it. Once approved, this toilet gets its own CleanConnect ID and QR
            code and citizens can report issues against it.
          </p>
          <button className="btn btn-primary mt-5" onClick={() => navigate('/my-toilet-requests')}>
            View my requests
          </button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <PageHeader
        title="Request Toilet Registration"
        subtitle="Can't find a toilet in our list? Tell us where it is and an admin will verify and register it. This does not create an official CleanConnect record directly — every request is reviewed first."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Where is it?</h2>
          <div className="space-y-4">
            <Field label="Location / Area *">
              <input
                id="location"
                type="text"
                className="field"
                placeholder="e.g. Near Kharadi bus stop"
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
            <Field label="Address">
              <input
                id="address"
                type="text"
                className="field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">More information</h2>
          <div className="space-y-4">
            <Field label="Description">
              <textarea
                id="description"
                rows={3}
                className="field"
                placeholder="Anything that helps an admin find and verify it."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </Field>
            <Field
              label="Photo (optional)"
              error={imageError}
              help={`JPEG, PNG or WEBP, up to ${MAX_IMAGE_MB}MB. Helps the admin verify the toilet exists.`}
            >
              <input
                id="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-slate-800 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </Field>
          </div>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <button
          type="submit"
          disabled={submitting || !location.trim()}
          className="btn btn-primary btn-block"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </PageContainer>
  );
}

export default ToiletRequestCreate;
