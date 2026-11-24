# Admin-panel test — 2026-11-24

Nine session reports from the 10-hour admin-panel test, run against the local emulator. The consolidated bug list (BUG-142 onward), the known bugs re-confirmed and the leak checks are in [bugs-admin.md](../../bugs-admin.md). Known ids BUG-041…BUG-141 cited there are logged in the `BUGS.md` of the `persona-soak-test` branch, so merge that branch first.

| Session | Account | Focus | Minutes | Report |
|---|---|---|---|---|
| S01 | admin@test.com (owner) | Users tab, tier and limit changes, admin access grant | 70 | [s01-admin-owner-users-and-grant.md](s01-admin-owner-users-and-grant.md) |
| S02 | admin@test.com (owner) | Settings, Settings password and every global switch | 70 | [s02-admin-owner-settings-and-switches.md](s02-admin-owner-settings-and-switches.md) |
| S03 | admin2@test.com (owner) | Moderation lifecycle, Trash, permanent deletion, Audit | 99 | [s03-admin2-owner-moderation-and-trash.md](s03-admin2-owner-moderation-and-trash.md) |
| S04 | admin2@test.com (owner) | Support tools (View as, notes, bulk, growth) and leak sweep | 70 | [s04-admin2-owner-support-tools-and-leaks.md](s04-admin2-owner-support-tools-and-leaks.md) |
| S05 | manager@test.com | Manager role boundaries | 70 | [s05-manager-role-boundaries.md](s05-manager-role-boundaries.md) |
| S06 | manager@test.com | Live effect of manager actions on open user sessions | 71 | [s06-manager-live-user-impact.md](s06-manager-live-user-impact.md) |
| S07 | manager@test.com (stand-in for p01) | New-manager first use | 70 | [s07-new-manager-p01-first-use.md](s07-new-manager-p01-first-use.md) |
| S08 | admin@test.com (p01 grant blocked) | Revoke charter blocked; closing regression sweep | 18 | [s08-new-manager-p01-revoke-and-sweep.md](s08-new-manager-p01-revoke-and-sweep.md) |
| S09 | p01.trader@test.com (granted manager), admin@ for the revoke | Real new-manager first use, revoke, grant edge cases | 70 | [s09-p01-real-manager-first-use-and-revoke.md](s09-p01-real-manager-first-use-and-revoke.md) |

Total: 608 minutes. A first run (11:46–12:07) was lost to an emulator start-up fault and is not kept here.
