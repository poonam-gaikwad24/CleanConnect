# CleanConnect — UI/UX styling pass

**Frontend only.** The backend, Prisma schema and migrations, database, `.env`, `package.json` files, routes (`AppRoutes.tsx`), authentication (`AuthContext`, API client) and the health-scoring formula are **byte-identical** to before (verified by diff). No new dependency, no migration. Module 10 was not started.

> A note on process: partway through, my sandbox was reset and I lost my working copy. I rebuilt the starting state from your original upload plus my three earlier deliveries (it passed all 66 earlier tests, confirming it matched), then redid and re-verified everything. All results below are from the final rebuilt state.

## 1. Audit — what the code actually looked like

| Finding | Evidence |
|---|---|
| **Home was a placeholder** | "Frontend foundation is running…" |
| **Navigation** | One wrapping row of up to 11 links; no active-page indicator; no mobile menu; low-contrast user text. **Admins and staff were shown citizen-only links** ("Report an Issue", "Request Toilet") that ended at "no permission". |
| **No shared look** | 7 different `h1` styles; 5 different page widths; the same primary button copy-pasted as 7 different class strings, with no keyboard-focus style; empty Tailwind theme, no custom CSS, no icon library |
| **Forms** | Login/Register used placeholders instead of labels; the toilet-search label wasn't tied to its input; errors weren't announced to screen readers |
| **Status** | Plain text only (no badges), e.g. "Status: In progress" |
| **Contrast** | 24 uses of `text-slate-400` (2.6:1 on white) |
| **Maintenance workflow** | No indication of where a task is in Assigned → In progress → Submitted → Verified; "Request further action" was white on amber (3.2:1) |
| Not found | No tables anywhere (all lists are card-like `<ul>`s), so there was nothing to fix for table overflow |

## 2. Design system

- **Colour:** deep civic green `brand` scale in `tailwind.config.ts` (primary buttons brand-700, white text 7.7:1). Red/amber/blue stay Tailwind defaults for error/warning/info. Neutrals stay slate. Page background `slate-50`.
- **CSS components** (`index.css`): `.btn` (+ `-primary -secondary -danger -outline-danger -sm -block`), `.field`, `.label`, `.help-text`, `.error-text`, `.card`, `.link`; plus a global visible keyboard-focus ring and `prefers-reduced-motion` handling.
- **React primitives** (`components/ui/`): `PageContainer` (4 widths), `PageHeader` (the one `h1` style, back link, actions), `Card`, `Alert`, `LoadingState`/`EmptyState`, `Badge`, `Field` (wires label, hint, error and `aria-describedby`/`aria-invalid` automatically), `ListCard`, `Pagination`, inline `icons` (no icon library exists; none added).
- **Domain components:** `StatusBadges` (one look and wording for complaint/task/request status and category — icon + text, never colour alone), `TaskProgress` (four-step workflow indicator, "Done / Current / Next" in words), `AppFooter`.
- **Navigation:** role-aware links (`utils/navLinks.ts`), active page marked (underline + bold + `aria-current`), mobile menu button with `aria-expanded`, closes on Escape / navigation, skip-to-content link, `<main>` landmark.
- **Accessibility fix found during verification:** form-field borders were 1.48:1 against white (WCAG asks 3:1 for the boundary of a text box). Now 4.76:1.

## 3. What changed, page by page

| Page | Improvement |
|---|---|
| Home | Real landing page: purpose, role-aware actions, "How it works" (static copy), and a live toilet count from the existing API (hidden if unavailable) |
| Login / Register | Centered card, real labels, `autocomplete`, announced errors |
| Toilets list | Responsive card grid (1 → 2 columns), search with icon, empty state, shared pagination, health badges kept. *The list API returns no star ratings, so none are shown rather than invented.* |
| Toilet Details | Previous pass's two-column layout, now on the shared buttons/container |
| Ratings & Reviews | Same functions; clearer average/count, form on the shared field styles, admin delete as outline-danger |
| Report an Issue | Three grouped cards (Toilet · Issue details · Photo evidence), labelled fields, field-level photo error, success screen |
| My Complaints / My Requests / Staff tasks / Admin lists | Card lists with status + category badges, empty states with a next action, shared pagination, labelled filter toolbars |
| Complaint Details | Two columns on desktop: the complaint (left), admin Status + Maintenance task/assignment (right); stacks on mobile |
| Task details (staff & admin) | Progress indicator, evidence photos side by side, clear "Your next step"/"Review the work" panel; rework request shown as a warning |
| Toilet Request Details | Details card + "Review request" panel with the duplicate-match warning; QR on approval |
| Admin: Manage Toilets / Add Toilet / Staff | Search with icon, QR toggle with `aria-expanded`, grouped form cards, empty states |
| Access denied / loading (`ProtectedRoute`) | Now use the shared alert and loading components |

## 4. Behaviour changes you should know about

1. **Navigation shows only role-relevant links** (citizen: Toilets, Report an Issue, My Complaints, Request a Toilet, My Requests · staff: Toilets, My Tasks · admin: Toilets, Complaints, Toilet Requests, Manage Toilets, Staff). Routes themselves are unchanged; a test confirms every nav link points to a route that role may open.
2. On the Toilets list, **"Request registration" and "Report an issue" now show only to citizens** (the routes are citizen-only; staff/admin previously saw links that ended at "no permission").
3. "Request Further Action" is now a neutral secondary button (was white-on-amber, 3.2:1).
4. If an admin task page fails to load, "Back" goes to the admin complaints list (it previously went to `/complaints/`, a dead end).
5. Forms gained labels and `autocomplete` attributes; Home is new content.

Everything else — API calls, state, handlers, validation, permissions — is unchanged. A script confirmed that for **18 of 19 pages the code above the markup (hooks, state, handlers, API calls) is identical to the original**; the 19th is Home, a deliberate replacement. The set of API functions each page imports is unchanged except Home (which gained the toilet count).

## 5. Tests actually run (Node 20.20.0)

| Check | Result |
|---|---|
| `tsc` (frontend) and `vite build` | clean; built |
| **Frontend automated tests** (`npx tsx --test …`): health card 31, layout 18, insight/tone 17, **design system + role navigation 29** | **95 / 95 pass** |
| **End-to-end smoke harness** (jsdom, stubbed API; optional folder `_e2e-harness/`): every route as every role (19 × 4 = 76 renders, each audited for labels, accessible names, landmarks, duplicate ids, console errors, correct nav links, correct refusal/redirect) plus 22 workflows | **23 / 23 pass** |
| Workflows covered | login/logout, mobile menu, active link, complaint reporting (search → choose → bad-file error → good file → submit), toilet request, reviews (citizen/admin/staff), health card states + disclosures, admin task assignment, complaint filters, staff Start → submit proof, rework request, admin verify / request further action, toilet-request approve/reject, staff creation, QR toggle, add toilet |
| Contrast (WCAG) | all text pairings ≥ 4.5:1, focus ring and bars ≥ 3:1 — computed |
| CSS | every class used (313) exists in the built stylesheet (catches silent typos); focus ring, reduced-motion and brand rules confirmed in the output |
| **Tests can fail:** I deliberately broke the nav (staff given a citizen link), `aria-expanded`, error-to-field linking, and an input label | each was caught |
| Backend / schema / config / routes / auth | identical to before (diff) |

**Not verified — please check on your machine:**
- **How it looks.** There is no browser in my sandbox, so I did not see a rendered page. Spacing, proportions and the exact feel are my best judgement; tell me what looks off.
- Real responsive behaviour at actual widths, real keyboard use (Tab/Enter/Space/Escape) and screen readers — only structure and attributes were checked.
- Real backend/database integration (the harness uses a stubbed API), real file uploads, Safari/Firefox/mobile browsers.
- Anything about performance.

## 6. Remaining / not done

- Star-rating component (`StarRating`) was not restyled; toilet list cards show no ratings (API limitation).
- No tables were introduced (none existed); cards were kept for consistency.
- **Prepared for Module 10, not built:** `PageContainer size="wide"`, `Card`, `Badge`, `Alert`, `EmptyState`, `LoadingState`, `Pagination`, `ListCard` are ready for dashboard screens. No chart or stat-card components exist yet.
- Fonts are the system default (no web-font download); no dark mode.
- Button borders (`slate-300`) are decorative since text labels identify buttons; input borders are strong.
- The health-score card itself was not redesigned again (done last task); only its retry button uses the shared style.

## 7. Applying it

Copy each file in `frontend/` to the same path in your `CleanConnect\frontend` folder (overwriting the 30 modified files; adding the 19 new ones). If your local copies differ from what I last delivered, use `docs/patches/*.diff`. **No `npm install` is needed** — no dependency changed.

```powershell
cd CleanConnect\frontend
npx tsc -p tsconfig.json --noEmit --composite false
npx tsx --test tests/toiletHealthView.test.tsx tests/toiletDetailsLayout.test.tsx tests/healthPresentation.test.ts tests/designSystem.test.tsx   # expect 95 pass
npm run dev
# optional end-to-end smoke test
npm install --no-save jsdom@24
node _e2e-harness/run.cjs      # expect: 23/23 scenarios passed
```

### Manual checklist (browser, with the backend running)
1. **Widths:** view Home, Toilets, a Toilet page, Report an Issue and an admin page at ~375px, ~768px and ~1280px. No sideways scrolling; buttons easy to tap; cards stack sensibly.
2. **Menu:** at ~375px the nav shows a Menu button; it opens, lists the right links for your role, closes on Escape and after choosing a page.
3. **Roles:** log in as citizen, staff and admin — the nav links match the list above and the active page is underlined.
4. **Keyboard:** press Tab from the top — the first stop is "Skip to main content"; every control shows a green focus ring; the Health card's "View score breakdown" opens with Enter/Space.
5. **Workflows:** report an issue (try a PDF as the photo → inline error), assign a task, staff Start → submit proof, admin Verify; approve a toilet request; create a staff account.
6. **Reduced motion:** DevTools → Rendering → emulate `prefers-reduced-motion: reduce` — spinners and transitions stop.
