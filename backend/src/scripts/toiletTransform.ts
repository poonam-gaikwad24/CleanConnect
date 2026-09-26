// Pure transform logic for the PMC public-toilet CSV dataset.
// Deliberately has no Prisma/database dependency, so it can be
// exercised and tested against the real CSV in isolation.

// ---------------------------------------------------------------------
// Exact column headers, as they actually appear in the source CSV.
// These are NOT guessed — confirmed by inspecting the file directly.
// Two of the four "Unnamed" columns in the raw file are genuinely
// empty (dropped); the other two ("Unnamed: 9", "Unnamed: 10") are
// present but contain the literal constant "Yes" in every row, with
// zero variance — also dropped, but for that reason, not because
// they're unlabeled.
// ---------------------------------------------------------------------
export const COLUMNS = {
  ward: 'Ward No.',
  communityOrPublic: 'Community/Public',
  location: 'Location of all the Public Toilets',
  status: 'Status of the Toilet\n(Constructed/Under Construction)',
  uniqueId: 'Unique ID of CT/PT\n (if th ULB says YES in the above question)',
  landmark: 'Landmark\n(Nearest Residential Area/\nCommercial Area)',
  monetized: 'Whether the PTU has been monitized?',
  ictFeedback: 'ICT Feedback device (wall mounted) installed?',
  googleMaps: 'Located on Google Maps',
  iec: 'Whether IEC Messaging (Suresh Raina - Swachh Sauchalaya) of\n MoUD 2017 is avaiable at the CT/PT? ',
} as const;

export interface RawRow {
  [key: string]: string;
}

export interface TransformedToilet {
  externalId: string;
  ward: number | null;
  type: string | null;
  location: string;
  landmark: string | null;
  status: string | null;
  isMonetized: boolean | null;
  hasIct: boolean | null;
  hasGoogleMapsListing: boolean | null;
  hasIec: boolean | null;
  latitude: null; // never populated by this script — see importToilets.ts
  longitude: null;
}

export type TransformResult =
  | { ok: true; toilet: TransformedToilet }
  | { ok: false; rowNumber: number; reason: string };

export function cleanText(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// "Yes"/"yes" -> true, "No"/"no" -> false, blank -> null.
// Never coerces blank to false — a blank cell means "unknown", not "no".
export function toBoolean(value: string | undefined): boolean | null {
  const cleaned = cleanText(value);
  if (cleaned === null) return null;
  const normalized = cleaned.toLowerCase();
  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;
  return null; // unrecognized value — treated as unknown, not guessed
}

// Transforms one raw CSV row into a Toilet record, or a skip reason.
export function transformRow(raw: RawRow, rowNumber: number): TransformResult {
  const externalId = cleanText(raw[COLUMNS.uniqueId]);
  const location = cleanText(raw[COLUMNS.location]);

  if (!externalId) {
    return { ok: false, rowNumber, reason: 'Missing Unique ID (externalId) — cannot import without it' };
  }

  if (!location) {
    return { ok: false, rowNumber, reason: 'Missing Location/address — required field' };
  }

  const wardRaw = cleanText(raw[COLUMNS.ward]);
  const ward = wardRaw !== null && /^\d+$/.test(wardRaw) ? parseInt(wardRaw, 10) : null;

  // The dataset's "ICT Feedback device installed?" column is always
  // populated with one of two descriptive values, not a plain Yes/No:
  //   "manual feedback"                  -> no automated device (false)
  //   "ICT Feedback system is in place"  -> device installed (true)
  // This maps directly onto the column's own question ("...installed?"),
  // so it's a direct reading of the data, not an invented interpretation.
  const ictRaw = cleanText(raw[COLUMNS.ictFeedback]);
  const hasIct =
    ictRaw === null
      ? null
      : ictRaw.toLowerCase().includes('ict feedback system is in place')
        ? true
        : ictRaw.toLowerCase().includes('manual feedback')
          ? false
          : null; // an unrecognized value — left unknown rather than guessed

  const toilet: TransformedToilet = {
    externalId,
    ward,
    type: cleanText(raw[COLUMNS.communityOrPublic]),
    location,
    landmark: cleanText(raw[COLUMNS.landmark]),
    status: cleanText(raw[COLUMNS.status]),
    isMonetized: toBoolean(raw[COLUMNS.monetized]),
    hasIct,
    // Both columns are 100% empty in the current dataset — always null,
    // never inferred from anything else.
    hasGoogleMapsListing: toBoolean(raw[COLUMNS.googleMaps]),
    hasIec: toBoolean(raw[COLUMNS.iec]),
    latitude: null,
    longitude: null,
  };

  return { ok: true, toilet };
}
