import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Role } from '../api/auth';
import type { Toilet } from '../api/toilets';
import { buildGoogleMapsSearchUrl } from '../utils/googleMapsLink';
import SectionCard from './SectionCard';

interface ToiletDetailsLayoutProps {
  toilet: Toilet;
  // null = signed out. Decides what the "Report an Issue" card offers;
  // the route itself (ProtectedRoute role="CITIZEN") still enforces access.
  role: Role | null;
  // The existing, self-fetching components are passed in as slots so the
  // page keeps exactly one request each (no duplicated API calls).
  healthCard: ReactNode;
  reviews: ReactNode;
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

// Layout plan
//   • Header card across the top: CleanConnect ID + name.
//   • lg and up: two columns. Left (5/12): Toilet Details + Report an Issue,
//     sticky so the report action stays in view while a long review list
//     scrolls. Right (7/12): Toilet Health Score + Ratings & Reviews.
//   • Below lg: ONE column, ordered Details → Health → Report → Reviews, so
//     the report action is not buried under a long list of reviews.
//     The two column wrappers use `display: contents` on small screens so
//     their children become siblings and `order-*` can interleave them;
//     from lg they become real flex columns.
function ToiletDetailsLayout({ toilet, role, healthCard, reviews }: ToiletDetailsLayoutProps) {
  const reportHref = `/complaints/create?toilet=${toilet.cleanConnectId ?? toilet.id}`;

  return (
    <div className="mt-4">
      <header className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-wide text-slate-600">
          CleanConnect ID: {toilet.cleanConnectId ?? 'Not yet assigned'}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{toilet.location}</h1>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Left column */}
        <div className="contents lg:sticky lg:top-6 lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
          <div className="order-1">
            <SectionCard title="Toilet Details" headingId="toilet-details-heading">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-1">
                <DetailItem label="Source (PMC) ID">
                  {toilet.externalId ?? 'None — registered directly via CleanConnect'}
                </DetailItem>
                <DetailItem label="Type">{toilet.type ?? 'Not recorded'}</DetailItem>
                <DetailItem label="Ward">{toilet.ward ?? 'Not recorded'}</DetailItem>
                <DetailItem label="Landmark">{toilet.landmark ?? 'Not recorded'}</DetailItem>
                <DetailItem label="Status">{toilet.status ?? 'Not recorded'}</DetailItem>
              </dl>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <a
                  href={buildGoogleMapsSearchUrl(toilet.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  View on Google Maps
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 4H5a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3M11 4h5v5M16 4l-7 7" />
                  </svg>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <p className="mt-2 text-xs text-slate-600">
                  The Google Maps link opens a search near this registered address. This is an
                  independent Google Maps search, not a confirmed exact match to CleanConnect's
                  record.
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="order-3">
            <SectionCard title="Report an Issue" headingId="toilet-report-heading">
              <p className="text-sm text-slate-700">
                Noticed a problem here, such as no water, broken fixtures or poor cleanliness?
                Report it so maintenance staff can act on it.
              </p>

              {role === 'CITIZEN' && (
                <Link
                  to={reportHref}
                  className="btn btn-primary mt-4"
                >
                  Report an issue
                </Link>
              )}

              {role === null && (
                <p className="mt-4 text-sm text-slate-700">
                  <Link to="/login" className="link">
                    Log in
                  </Link>{' '}
                  to report an issue.
                </p>
              )}

              {role !== null && role !== 'CITIZEN' && (
                <p className="mt-4 text-sm text-slate-600">Issue reports are submitted by citizens.</p>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Right column */}
        <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
          <div className="order-2">{healthCard}</div>
          <div className="order-4">{reviews}</div>
        </div>
      </div>
    </div>
  );
}

export default ToiletDetailsLayout;
