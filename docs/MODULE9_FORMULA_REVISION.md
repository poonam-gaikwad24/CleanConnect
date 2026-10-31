# Module 9 — Health Score Formula Revision (revision 2)

**No database change. No Prisma migration. No `prisma generate`. No new dependency. Five files change; the service, controller, routes, API response shape and every other module are untouched.** Supersedes the formula sections of the earlier Module 9 handover.

---

## 1. Original formula and what was actually wrong

`score = Open Issues (0–60) + Citizen Experience (0–30) + Verified Maintenance (0–10)`

I reproduced your `CC-PMC-0001` result with the code first: **74 / FAIR = 60 + 8.7 + 5**. (8.7 implies your three ratings sum to 4, e.g. 1, 1, 2 — average 1.33.) Then I tested your proposed 50/40/10 weights **on their own**, with nothing else changed:

| Case | Revision 1 (60/30/10) | 50/40/10 weights only |
|---|---|---|
| CC-PMC-0001 | 74 Fair | **67 Fair** |
| 50 reviews, every one 1★, no complaints | **61 Fair** | **51 Fair** |

So reweighting alone does not fix it. Inspection found four real defects inside the categories:

1. **"No open complaints" was awarded in full whatever citizens said.** The worst possible feedback could never push a toilet below Fair (50 reviews of 1★ scored 61). Unhappy people do not always file a complaint, so absence of complaints is only weak, *indirect* evidence.
2. **The verified-maintenance bonus ignored both** citizen satisfaction and any problems still open, so it could offset them.
3. **Confidence ignored what kind of evidence existed.** Three complaint records and zero reviews counted as "sufficient", though nobody had described the toilet's condition.
4. **Rounding was inconsistent.** Your `8.7` is mathematically 8.75, which should be 8.8; binary floating-point error rounded it down. The same flaw affects any weight: an exhaustive search over small review counts finds many exact ties that display one tenth too low (e.g. 21 reviews summing to 102 give exactly 36.25 but displayed 36.2 at 40 points).

## 2. Final formula

`score = OPEN ISSUES (0–50) + CITIZEN EXPERIENCE (0–40) + VERIFIED MAINTENANCE (0–10)`

I adopted your proposed 50/40/10 weights (they are reasonable: unresolved problems stay the largest share, and citizens' direct feedback gets real weight) **plus** the within-category changes below. All constants live in one `HEALTH_CONFIG` object.

**Step 0 — satisfaction and trust (computed first)**
- `adjusted = (n × avg + 3 × 3.0) / (n + 3)` — the average, weighted toward neutral as if 3 neutral reviews existed; no reviews ⇒ 3.0. (Unchanged.)
- `trust = clamp((adjusted − 1) / 2, 0, 1)` — **new.** 3★ or better ⇒ 100%, 2★ ⇒ 50%, 1★ ⇒ 0%.

**Open issues (50)** — `points = (50 − penalty) × trust`
- `penalty` = Σ `categoryBase × stageFactor` over complaints not RESOLVED, capped at 50. Bases: water 20, broken infrastructure 20, cleanliness 15, other 8. Stage factors (from the complaint's task): nothing done 1.0 · in progress, no task 0.8 · ASSIGNED 0.8 · REVISION_REQUIRED 0.8 · IN_PROGRESS 0.6 · SUBMITTED 0.4. (Unchanged.)
- Repeat reports in one category: largest in full, each extra 25%. (Unchanged.)

**Citizen experience (40)** — `points = 40 × (adjusted − 1) / 4`. 5★ ⇒ 40, 3★ ⇒ 20, 1★ ⇒ 0. No reviews ⇒ neutral 20, stated in the response.

**Verified maintenance (10)** — `points = min(10, 5 × verifiedFixes) × trust × (50 − penalty) / 50`
- A fix counts only if the complaint is RESOLVED **and** its task is VERIFIED by an admin. A manually-resolved complaint removes its penalty but earns **no** bonus — "resolved" is never assumed to mean "verified".
- The bonus shrinks as open problems grow (it reaches 0 when they exhaust the open-issues component), so it cannot conceal them.

**Confidence** — evidence = reviews + complaints. 0 ⇒ INSUFFICIENT (`score: null`). 1–2 records **or no reviews yet** ⇒ LIMITED. Otherwise SUFFICIENT.

**Rounding** — each factor to one decimal, half-up, with a 1e-7 tolerance against floating-point error; `score = round-half-up(sum ÷ 10)`. The factors you see always add up to the score you see.

**Labels** — unchanged: Good ≥ 75, Fair 50–74, Needs Attention < 50. I checked them against a rating sweep (20 reviews, no complaints): 1.5★ → 20, 2.0★ → 40, 2.5★ → 55, 3.0★ → 70, 3.5★ → 74, 4.0★ → 79, 5.0★ → 87. "Good" needs roughly 3.6★ or better; "Needs Attention" below roughly 2.4★. That matches how a citizen would read those ratings.

**Not double counted** — a complaint and its task are one problem: an open complaint acts only through its penalty, a resolved one only through the bonus. Test: the same complaint with and without a task row gives the same score.

**Deterministic** — no clock; complaint age is deliberately unused.

## 3. `CC-PMC-0001`: before and after

Data: 0 open complaints · 3 reviews averaging 1.33★ · 1 complaint resolved and verified.

| | Before | After |
|---|---|---|
| Open issues | 60 / 60 | **29.2 / 50** — `50 × trust 58.3%` |
| Citizen experience | 8.7 / 30 | **11.7 / 40** — `40 × (2.167 − 1) / 4` |
| Verified maintenance | 5 / 10 | **2.9 / 10** — `5 × 58.3%` |
| **Score** | **74 — Fair** | **44 — Needs Attention** |

`adjusted = (3 × 1.333 + 9) / 6 = 2.167`, so `trust = (2.167 − 1)/2 = 58.3%`. The page now explains: *"Citizen ratings are below average, so credit for having no open complaints and for past fixes is reduced to 58%."*

I did not pick this to hit a number: it falls out of one rule, and the same rule leaves well-rated toilets almost unchanged (below). Caveat: I inferred the exact ratings (sum 4) from your 8.7; your live value will differ if they aren't, e.g. 1, 1, 2.

## 4. Scenario table (measured: previous module vs new module, same inputs)

| Scenario | Before (60/30/10) | After |
|---|---|---|
| CC-PMC-0001 (3 reviews, avg 1.3★, 1 verified fix) | 74 Fair | **44 Needs Attention** |
| No reviews, no complaints | no score | no score |
| 20 reviews avg 5.0★, no complaints | 88 Good | 87 Good |
| 20 reviews avg 4.0★, no complaints | 82 Good | 79 Good |
| 20 reviews avg 3.0★, no complaints | 75 Good | **70 Fair** |
| 20 reviews avg 2.0★, no complaints | 69 Fair | **40 Needs Attention** |
| 5 reviews avg 1.4★, no complaints | 68 Fair | **35 Needs Attention** |
| 50 reviews avg 1.0★, no complaints | 61 Fair | **4 Needs Attention** |
| 20 × 5.0★ + 3 open complaints | 33 Needs Attention | 37 Needs Attention |
| 20 × 1.5★ + 3 open complaints | 10 Needs Attention | 7 Needs Attention |
| 20 × 4.0★, complaint resolved, **not** verified | 82 Good | 79 Good |
| 20 × 4.0★, complaint resolved **and** verified | 87 Good | 84 Good |
| 20 × 4.0★, water complaint, task ASSIGNED | 66 Fair | 63 Fair |
| One 1★ review (limited) | 71 Fair | 53 Fair |
| One 5★ review (limited) | 79 Good | 75 Good |
| 20 × 5.0★, 2 verified fixes, 2 serious open | 58 Fair | **49 Needs Attention** |
| 500 × 5.0★, 2 verified fixes, none open | 100 Good | 100 Good |

Reading it: toilets with good ratings move by only 1–4 points (a neutral 3.0★ toilet moves 5); toilets with poor ratings and several reviews drop by about 29–57 points (a single 1★ review, which is limited evidence, drops 18); and the verified bonus no longer rescues a toilet with serious open problems (58 → 49).

## 5. Required scenarios — input, factor scores, expected final score

Format: factors = [open issues /50 · experience /40 · verified maintenance /10]. Expected values were hand-calculated; the tests assert them.

| # | Input | Factors | Score | Label / confidence |
|---|---|---|---|---|
| 1 | no reviews, no complaints | — | none | Insufficient |
| 2 | 20 × 5.0★, no open | 50 · 37.4 · 0 | 87 | Good / Sufficient |
| 3 | 5 reviews avg 1.4★, no open | 25 · 10 · 0 | 35 | Needs Attention / Sufficient |
| 4 | 20 × 5.0★, 3 open (water, broken, cleanliness) | 0 · 37.4 · 0 | 37 | Needs Attention |
| 5 | 20 × 1.5★, 3 open | 0 · 7.0 · 0 | 7 | Needs Attention |
| 6 | 20 × 4.0★, resolved, not verified | 50 · 28.7 · 0 | 79 | Good |
| 7 | 20 × 4.0★, resolved + verified | 50 · 28.7 · 5 | 84 | Good |
| 8 | 20 × 4.0★, water complaint with task ASSIGNED | 34 · 28.7 · 0 | 63 | Fair (counted once) |
| 9 | one 1★ review | 37.5 · 15 · 0 | 53 | Fair / **Limited** |
| 10 | one 5★ review | 50 · 25 · 0 | 75 | Good / **Limited** |
| 11 | two 4★ reviews | 50 · 24 · 0 | 74 | Fair / **Limited** |
| 12 | 10 × 4.5★, no verified history | 50 · 31.5 · 0 | 82 | Good (81.5 rounds up) |

## 6. Tests actually executed (Node 20.20.0, your version)

| Check | Result |
|---|---|
| Scoring + permission tests (12 scenarios, CC-PMC-0001 regression, poor-ratings, complaints, bonus, confidence, rounding, determinism, explanation-vs-calculation, 5000 seeded inputs) | **72 / 72 pass** |
| HTTP/API tests (incl. new "poorly rated, no complaints" API test) | **21 / 21 pass** |
| Frontend rendering tests (incl. new wording / low-rating tests) | **13 / 13 pass** |
| `tsc` backend and frontend, `vite build` | clean |
| **Independent check:** exact-fraction Python reference written from the spec vs the TypeScript, 4000 random inputs | **0 mismatches** |

Invariants covered: score always null or an integer 0–100; every factor within its maximum; `round(sum of factor points) === score` on all 5000 seeded inputs; same inputs ⇒ same score (and order-independent); bonus can never exceed 100; ≥5 reviews at ≤2.0★ with no complaints always Needs Attention; score never falls as the average rating rises; adding an open complaint never raises the score.

**Tests can fail:** I broke each new rule in turn — trust forced to 100% (your weights-only proposal) → 12 failures; bonus ignoring open problems → 2; confidence ignoring the review rule → 1; rounding tolerance removed → 6 (after I replaced my first rounding test, which wrongly passed). Two of my own expectations were wrong at first and I corrected them (the three-review behaviour, below; the rounding examples).

**Not verified here:** the real Prisma queries on your PostgreSQL (unchanged by this revision; use `docs/health_crosscheck.sql`), and browser behaviour (rendering is tested statically only).

## 7. Files and integration

Copy each file to the same relative path inside `CleanConnect`:

| File | Why |
|---|---|
| `backend/src/utils/toiletHealth.ts` | The formula (weights, trust, bonus gating, confidence, rounding, explanations) |
| `backend/tests/toiletHealth.test.ts` | Rewritten for revision 2 |
| `backend/tests/api.test.ts` | One expectation updated (60 → 50) + new poor-ratings API test |
| `frontend/src/components/ToiletHealthView.tsx` | Wording: estimate not inspection, why it differs from stars, what raised/lowered it, evidence count, 50/40/10 help text |
| `frontend/tests/toiletHealthView.test.tsx` | Updated for the new text and numbers |

If your local copies differ from mine, apply `docs/patches/*.diff` instead.

```powershell
# from CleanConnect\backend  (restart the backend after copying)
npx tsc --noEmit
npx tsx --test tests/toiletHealth.test.ts tests/reviewPermissions.test.ts tests/api.test.ts   # expect 93 pass
npm run dev

# from CleanConnect\frontend
npx tsx --test tests/toiletHealthView.test.tsx                                                # expect 13 pass
```
Then: `Invoke-RestMethod "http://localhost:5000/api/toilets/CC-PMC-0001/health" | ConvertTo-Json -Depth 6` should show **44 / NEEDS_ATTENTION** if your ratings sum to 4 (check the three factor values and the explanation note). **No Prisma migration is required.**

## 8. Remaining limitations and assumptions

- **Three reviews is still weak evidence by design.** The neutral prior carries half the weight at n = 3, so three 2.0★ reviews score 53 (Fair) while three 1.5★ score 44. From five reviews, 2.0★ or worse is always Needs Attention. I did not retune the prior to hide this; it is a documented trade-off against over-reacting to a couple of reviews.
- **A neutral 3.0★ toilet with no complaints is now Fair (70), not Good.** A direct consequence of reserving the top for positive evidence; "Good" needs about 3.6★+.
- **Poor ratings are intentionally counted twice** (in the experience points and in the trust applied to the indirect credits). Good ratings are counted once. The asymmetry is the point: only low satisfaction makes "no complaints" less believable.
- **One 5★ review gives 75 "Good (limited data)".** Flagged, not hidden; a label cap for limited evidence would be easy to add.
- **Complaint-only toilets** (no reviews) can still reach "Good (limited data)"; they are always labelled limited and the page says no reviews exist.
- A complaint with a SUBMITTED task keeps 40% of its penalty, so a 5★ toilet with one submitted-but-unverified complaint can still be Good. That partial credit is unchanged from revision 1.
- Weights and penalties are **judgement-based, not calibrated** on real outcomes. Complaint age is ignored (determinism). Review text is not analysed (no AI by design).
- The score never claims a physical inspection, and the page now says it is an estimate.

## 9. Viva questions and answers (about this implementation)

**1. What was wrong with the first formula?**
"No open complaints" earned full marks regardless of what citizens said. So 50 reviews of 1★ with no complaints scored 61, "Fair". Changing the weights alone only moved that to 51; the flaw was inside the categories.

**2. How does the revised formula fix it?**
It computes a *trust* value from the shrunk average rating (3★+ = 100%, 1★ = 0%) and multiplies the two indirect credits — "no open complaints" and "past verified fixes" — by it. Unhappy citizens make absence of complaints less believable, so that credit shrinks.

**3. Why not just lower the open-issues weight or cap the score?**
Lower weight punishes toilets with complaints and ratings equally and still leaves 50 reviews of 1★ at Fair. A cap needs arbitrary breakpoints. Trust is one continuous, explainable rule and it never raises a score, only withholds credit.

**4. Why can the verified-maintenance bonus not hide serious problems?**
It is multiplied by the fraction of the open-issues component that is still intact. With two serious open complaints it keeps only 20%, and with three it is zero. It is also scaled by trust.

**5. How do you avoid counting a complaint and its maintenance task twice?**
They are one problem. An open complaint acts only through its penalty (the task status just sets how much); a resolved complaint acts only through the bonus. A test confirms the same complaint with and without a task row scores identically.

**6. Is "resolved" treated as "verified"?**
No. A complaint marked RESOLVED removes its penalty, but only a RESOLVED complaint whose task an admin VERIFIED earns the bonus. Scenario 6 vs 7 is exactly a 5-point difference.

**7. How do you handle missing and limited data?**
No reviews and no complaints give `null`, shown as "Not enough data". One or two records, or no reviews at all, are flagged LIMITED and the label says "(limited data)". Missing reviews use a neutral value that the breakdown states.

**8. Why does the explanation always agree with the score?**
Each factor is rounded once to a tenth; the score is the rounded sum of those tenths. A test over 5000 seeded inputs checks `round(sum of displayed factors) === score`. I also fixed a floating-point bug where an exact 8.75 displayed as 8.7.

**9. How did you test correctness beyond unit tests?**
I wrote an independent reference implementation in Python using exact fractions, straight from the formula description, and compared 4000 random inputs: zero mismatches. I also deliberately broke each rule to confirm the tests fail.

**10. What does this score *not* tell you?**
It is an estimate from reviews, complaints and admin-verified records. It is not an inspection, so a toilet can be dirty today with no complaint yet. That is why the page says "estimate" and why low evidence is flagged.
