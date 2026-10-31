# Toilet Details page — UI/UX improvement

**Frontend only.** No backend, API, scoring-formula, Prisma, database, `.env` or `package.json` change. No migration. No new dependency. Reviews, authentication and role permissions behave as before (one deliberate exception, flagged below).

## Layout plan (based on what the code actually did)

**Before:** `ToiletDetails.tsx` put everything — details, health score, reviews — inside one `max-w-xl` (576px) card, so desktop got a narrow, very long column. "Report an issue" was a small text link (there is no inline complaint form, so none was invented), shown to every logged-in user even though `/complaints/create` is citizen-only.

**After:**

| Screen | Arrangement |
|---|---|
| Header (all) | Card with CleanConnect ID and the toilet name (`h1`) |
| **Desktop (≥ 1024px)** | 12-column grid. **Left (5/12, sticky):** Toilet Details, Report an Issue. **Right (7/12):** Toilet Health Score, Ratings & Reviews. The left column stays in view while a long review list scrolls, so reporting is always one click away. |
| **Tablet / mobile** | One column, ordered **Details → Health → Report → Reviews**, so the report action is not buried under a long review list. |

The mobile order is done with `display: contents` on the two column wrappers plus `order-*` — the same four cards, rendered once; nothing is duplicated and each existing component still makes exactly one request.

## Health score card

Visible by default: heading, `score/100`, status badge (icon + text), progress bar with faint ticks at 50 and 75, the required one-line explanation, **one dynamic insight**, a compact "Based on N records · Limited/Sufficient evidence" line, and the concise disclaimer.

Collapsed by default (native `<details>`, so Tab/Enter/Space and open/closed announcements come from the browser): **View score breakdown** (three factors as `points/max` with progress bars and the API's own explanations, plus the API notes) and **How is this calculated?** (plain-language rules, score categories, and why it differs from the star rating — stated once).

"Not enough data yet" is preserved (no number, no bar, no breakdown); the methodology stays available, collapsed.

**The insight** is chosen from the factor values the API returns — no hardcoded message, no text parsing. Example for `CC-PMC-0001`: *"Citizen ratings are low, although no complaints are currently open."* It stays silent when the numbers can't support a statement. It mirrors the backend formula (`healthPresentation.ts` documents the algebra), so revisit it if the formula changes.

## Files

Copy each to the same relative path in `CleanConnect`. If your local copies differ from what I last delivered, apply `docs/patches/*.diff` instead.

**New (6):** `frontend/src/components/SectionCard.tsx` · `Disclosure.tsx` · `ToiletDetailsLayout.tsx` · `frontend/src/utils/healthPresentation.ts` · `frontend/tests/healthPresentation.test.ts` · `frontend/tests/toiletDetailsLayout.test.tsx`

**Modified (4):**
| File | Change |
|---|---|
| `frontend/src/components/ToiletHealthView.tsx` | Redesigned card (above). `ToiletHealthBadge` (list page) behaves the same; its muted text was darkened for contrast. |
| `frontend/src/pages/ToiletDetails.tsx` | Fetching logic unchanged; markup now delegated to `ToiletDetailsLayout` (106 → 64 lines). |
| `frontend/src/components/ToiletReviews.tsx` | Only the outer wrapper/heading now use the shared card, and one metadata line darkened for contrast (8 changed lines). All review logic untouched. |
| `frontend/tests/toiletHealthView.test.tsx` | Rewritten for the new markup. |

## Behaviour changes to be aware of

1. **Report an Issue card is now role-aware.** CITIZEN: button to the existing form (same URL as before). Signed out: "Log in to report an issue". STAFF/ADMIN: "Issue reports are submitted by citizens." Before, staff and admins saw a link that led to "You don't have permission". The route still enforces access; nothing about permissions was loosened.
2. **The page is wider** (`max-w-5xl`) while the nav bar content stays `max-w-3xl`. I did not touch the shared NavBar.
3. Two accessibility fixes: progress-bar fills darkened (green/amber were below 3:1 against their track), and a few `slate-400` text spots darkened (2.56:1 → ≥ 4.5:1). Other pages still use `slate-400` in places; I left them alone.

## Tests actually run (Node 20.20.0)

| Check | Result |
|---|---|
| `tsc` (frontend), `vite build` | clean |
| Frontend tests: health view (31), layout (18), insight/tone (17) | **66 / 66 pass** |
| Backend suites and `tsc` (untouched; confirming no regression) | 72/72, 21/21, clean |
| Insight truthfulness: 20,000 random inputs scored by the real backend; every claim the insight made checked against the underlying data | **0 false claims** (19,735 scored) |
| Explanation text vs backend: point maxima, 75/50 thresholds, and 8 behavioural claims ("poor ratings reduce no-complaint credit", "bonus reduced while problems open", …) | **15/15 verified** |
| Contrast: 19 colour pairs computed (WCAG) | all pass after the two fixes |
| CSS: every utility used (`group-open:`, `contents`, `lg:sticky`, `motion-reduce:`, …) exists in the built stylesheet, in the right cascade order, mobile-first | confirmed |
| **Full page in jsdom** with a stubbed API (sandbox only, **not** part of your project): 13 scenarios — real clicks open/close both sections; collapsed by default; guest/citizen/admin/staff; rate, delete own, admin delete; health refetches after a review change; error + retry; insufficient and limited states; one request each for toilet/health/reviews; ARIA names and unique ids | **13 / 13 pass** |

I broke the behaviours on purpose (sections open by default, wrong mobile order, health not refreshing after a review change, report button shown to guests) and each was caught.

**Not verified here:** how it *looks*. There is no browser in my sandbox, so I verified structure, classes, generated CSS and behaviour, not pixels. Please check the widths below. Real keyboard use (Tab/Enter/Space on the summaries) relies on the browser's native `<details>`; I confirmed they are focusable, not the key presses.

## Run locally

```powershell
cd CleanConnect\frontend
npx tsc -p tsconfig.json --noEmit --composite false
npx tsx --test tests/toiletHealthView.test.tsx tests/toiletDetailsLayout.test.tsx tests/healthPresentation.test.ts   # expect 66 pass
npm run build
npm run dev
```

## Manual checklist (browser)

1. Open `/toilets/CC-PMC-0001` at **~1280px**: header on top, then two columns — Details + Report on the left, Health + Reviews on the right. Scroll a long review list: the left column stays in view.
2. At **~768px** and **~375px** (DevTools device toolbar): one column, order Details → Health → Report → Reviews; no sideways scrolling; buttons easy to tap.
3. Health card: `44/100`, Needs Attention badge with an icon, the insight sentence, "Based on 4 records · Sufficient evidence", the disclaimer. Both sections **closed**; click "View score breakdown" → 29.2/50, 11.7/40, 2.9/10 with bars; click again → closes. Same for "How is this calculated?". Try Tab → Enter / Space.
4. A toilet with no reviews or complaints: "Not enough data yet", no number.
5. Ratings & Reviews still work: citizen can rate/edit/delete their own review; admin sees "Delete review (admin)"; staff sees no controls; after any change the health card refreshes.
6. Report an Issue: citizen → button opens the complaint form; signed out → "Log in" link; staff/admin → the short note.
7. DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": no chevron/bar animation.

## Remaining limitations

- The insight depends on the backend's current formula (it recovers ratings/trust/open-complaints from the factor points). It is silent when ratings are so low that rounding makes the numbers ambiguous.
- Mobile order relies on `display: contents`; supported in all current browsers.
- Visual polish (spacing, proportions) is my best judgement without seeing it rendered — tell me what looks off and I'll adjust.
