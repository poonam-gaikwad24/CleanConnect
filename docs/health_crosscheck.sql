-- READ-ONLY. Module 9 manual cross-check.
-- Prints the raw numbers the health score is built from, for ONE toilet,
-- straight from your database, so you can compare them with
--   GET /api/toilets/<id>/health
-- Usage (replace the ID; no password is stored in this file):
--   psql -h localhost -U <user> -d cleanconnect -v cc="'CC-PMC-0001'" -f health_crosscheck.sql

\echo '--- toilet'
SELECT id, "cleanConnectId" FROM "Toilet" WHERE "cleanConnectId" = :cc OR id = :cc;

\echo '--- reviews (reviewCount, averageRating)'
SELECT count(*) AS review_count, round(avg(r.rating)::numeric, 3) AS average_rating
FROM "Review" r JOIN "Toilet" t ON t.id = r."toiletId"
WHERE t."cleanConnectId" = :cc OR t.id = :cc;

\echo '--- complaints (totalComplaints = all rows below)'
SELECT c.status, count(*) AS n
FROM "Complaint" c JOIN "Toilet" t ON t.id = c."toiletId"
WHERE t."cleanConnectId" = :cc OR t.id = :cc
GROUP BY c.status ORDER BY c.status;

\echo '--- open complaints (category, status, task status) = openComplaints'
SELECT c.category, c.status, m.status AS task_status
FROM "Complaint" c
JOIN "Toilet" t ON t.id = c."toiletId"
LEFT JOIN "MaintenanceTask" m ON m."complaintId" = c.id
WHERE (t."cleanConnectId" = :cc OR t.id = :cc) AND c.status <> 'RESOLVED'
ORDER BY c.category, c.status;

\echo '--- verifiedFixes (RESOLVED complaint whose task is VERIFIED)'
SELECT count(*) AS verified_fixes
FROM "Complaint" c
JOIN "Toilet" t ON t.id = c."toiletId"
JOIN "MaintenanceTask" m ON m."complaintId" = c.id
WHERE (t."cleanConnectId" = :cc OR t.id = :cc) AND c.status = 'RESOLVED' AND m.status = 'VERIFIED';
