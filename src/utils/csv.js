// Shared CSV primitives. Extracted from export-csv.js (ADMIN-3) so the user export
// and the admin exports escape identically — CSV quoting is exactly the kind of rule
// you never want two copies of. Pure + unit-tested.

// A cell starting with one of these is executed as a FORMULA by Excel / Sheets / LibreOffice
// (CSV injection, CWE-1236). Our exports carry user-controlled text — a display name, a
// portfolio name, an audit details string — so a user could name themselves
// `=HYPERLINK("http://evil","click")` and have it fire inside an admin's spreadsheet.
const FORMULA_LEAD = /^[=+\-@\t\r]/;
// ...but a plain number must stay a number. Prefixing a legitimate "-12.5" would turn a
// numeric column into text and silently break every sum in the sheet.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

// CSV-escape one field: neutralise a formula lead, then wrap in quotes if it contains a
// comma, quote, or newline.
export function esc(v) {
  let s = v == null ? "" : String(v);
  if (FORMULA_LEAD.test(s) && !PLAIN_NUMBER.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// One CSV line from an array of cells.
export const row = (cells) => cells.map(esc).join(",");

// Excel on Windows reads a UTF-8 file as the local codepage unless it sees a BOM,
// which mangles every non-ASCII character. Prefix downloads with this.
export const CSV_BOM = "﻿";
