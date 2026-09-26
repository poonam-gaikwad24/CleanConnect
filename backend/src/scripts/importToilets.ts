import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../config/db';
import { getNextCleanConnectId } from '../services/toilet.service';
import { RawRow, transformRow } from './toiletTransform';

// Defaults to the dataset shipped in the repo; override with:
//   npm run import:toilets -- /path/to/other.csv
const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../data/pune-public-toilets.csv');
const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;

interface ImportSummary {
  totalRows: number;
  imported: number;
  updated: number;
  backfilledCleanConnectIds: number;
  skipped: { rowNumber: number; reason: string }[];
  duplicateExternalIdsInFile: string[];
  rowsWithoutCoordinates: number;
}

async function runImport(): Promise<ImportSummary> {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const rows: RawRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  const summary: ImportSummary = {
    totalRows: rows.length,
    imported: 0,
    updated: 0,
    backfilledCleanConnectIds: 0,
    skipped: [],
    duplicateExternalIdsInFile: [],
    rowsWithoutCoordinates: 0,
  };

  const seenExternalIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    const result = transformRow(rows[i], rowNumber);

    if (!result.ok) {
      summary.skipped.push({ rowNumber: result.rowNumber, reason: result.reason });
      continue;
    }

    const { toilet } = result;

    if (seenExternalIds.has(toilet.externalId)) {
      summary.duplicateExternalIdsInFile.push(toilet.externalId);
      continue;
    }
    seenExternalIds.add(toilet.externalId);

    const existing = await prisma.toilet.findUnique({ where: { externalId: toilet.externalId } });

    if (existing && existing.cleanConnectId) {
      // Already has a permanent CleanConnect ID — refresh every other
      // field from the CSV, but never touch cleanConnectId. This is
      // what guarantees "PMC ID -> CC-PMC-0001" stays fixed across
      // re-imports.
      await prisma.toilet.update({ where: { externalId: toilet.externalId }, data: toilet });
      summary.updated++;
    } else {
      // Either a brand-new row, or an existing row imported before
      // Module 4 (predates the cleanConnectId column) that still
      // needs one backfilled. Either way it gets the next available id.
      const cleanConnectId = await getNextCleanConnectId();

      await prisma.toilet.upsert({
        where: { externalId: toilet.externalId },
        create: { ...toilet, cleanConnectId },
        update: { ...toilet, cleanConnectId },
      });

      if (existing) {
        summary.updated++;
        summary.backfilledCleanConnectIds++;
      } else {
        summary.imported++;
      }
    }

    if (toilet.latitude === null || toilet.longitude === null) {
      summary.rowsWithoutCoordinates++;
    }
  }

  return summary;
}

function printSummary(summary: ImportSummary): void {
  console.log('\n=== CleanConnect Toilet Import Summary ===');
  console.log(`Total rows in CSV:              ${summary.totalRows}`);
  console.log(`Newly imported:                 ${summary.imported}`);
  console.log(`Updated (already existed):      ${summary.updated}`);
  console.log(`  ...of which backfilled a new CleanConnect ID: ${summary.backfilledCleanConnectIds}`);
  console.log(`Skipped (invalid/missing data): ${summary.skipped.length}`);
  console.log(`Duplicate externalId in file:   ${summary.duplicateExternalIdsInFile.length}`);
  console.log(`Rows without coordinates:       ${summary.rowsWithoutCoordinates}`);

  if (summary.skipped.length > 0) {
    console.log('\n--- Skipped rows ---');
    for (const s of summary.skipped) {
      console.log(`  Row ${s.rowNumber}: ${s.reason}`);
    }
  }

  if (summary.duplicateExternalIdsInFile.length > 0) {
    console.log('\n--- Duplicate externalIds within the file (only first occurrence imported) ---');
    for (const id of summary.duplicateExternalIdsInFile) {
      console.log(`  ${id}`);
    }
  }

  console.log(
    '\nNote: latitude/longitude are not present in the source dataset and are never ' +
      'invented by this script or any other part of CleanConnect. Every toilet\'s ' +
      'reliable identifier is its cleanConnectId (e.g. "CC-PMC-0001"), assigned once ' +
      'and preserved across re-imports — see getNextCleanConnectId() in toilet.service.ts.'
  );
}

async function main() {
  try {
    const summary = await runImport();
    printSummary(summary);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
