// Soft-delete (trash) helpers shared by the user app and the admin dashboard.

export const TRASH_GRACE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// How many days remain to restore a trashed account.
//   deletedAt : ms timestamp when the account was trashed (falsy => not trashed)
//   now       : current ms (injectable for tests)
//   graceDays : length of the grace window
// Returns null when the account isn't trashed, else an integer >= 0 (partial days
// round up, so "0 days left" only shows once the window has truly elapsed).
export function trashDaysLeft(deletedAt, now = Date.now(), graceDays = TRASH_GRACE_DAYS) {
  if (!deletedAt) return null;
  const remainingMs = graceDays * DAY_MS - (now - deletedAt);
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}
