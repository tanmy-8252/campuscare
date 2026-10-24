import assert from "node:assert/strict";
import { googleStartSchema, parseGoogleIntent, googleAccountDestination, GOOGLE_INTENT_SECONDS, signInNotice } from "../lib/google-intent.ts";

const now = Date.now();
const organisationId = "78271ea0-8bc0-451f-9ca2-90ad8fa6a882";
const intent = { role: "worker", organisationId, createdAt: now };
const account = { role: "worker", status: "active", organisation: { id: organisationId } };
assert.deepEqual(parseGoogleIntent(JSON.stringify(intent), now), intent);
for (const invalid of [undefined, "{", "x".repeat(513), JSON.stringify({ ...intent, role: "owner" }), JSON.stringify({ ...intent, organisationId: "bad" }), JSON.stringify({ ...intent, next: "https://evil.example" }), JSON.stringify({ ...intent, createdAt: now - GOOGLE_INTENT_SECONDS * 1000 - 1 }), JSON.stringify({ ...intent, createdAt: now + 5001 })]) {
  assert.equal(parseGoogleIntent(invalid, now), null);
}
assert.equal(googleStartSchema.safeParse({ role: "admin", next: "https://evil.example" }).success, false);
assert.equal(googleStartSchema.safeParse({ role: "superadmin" }).success, false);
assert.equal(googleAccountDestination(intent, null), "/onboarding?role=worker");
assert.equal(googleAccountDestination(intent, account), "/");
assert.equal(googleAccountDestination({ ...intent, role: "admin" }, account), null);
assert.equal(googleAccountDestination({ ...intent, organisationId: "8c659a64-cd72-4ba7-9345-c4c396973560" }, account), null);
assert.equal(googleAccountDestination({ role: "worker", createdAt: now }, account), null);
assert.equal(googleAccountDestination(intent, { ...account, status: "pending" }), "/pending");
assert.equal(googleAccountDestination(intent, { ...account, status: "rejected" }), "/pending");
for (const notice of ["https://evil.example", "__proto__", "constructor", "toString", undefined]) assert.equal(signInNotice(notice), "");
assert.match(signInNotice("google-expired"), /expired/);
console.log("PASS: OAuth intent expires, rejects tampering, enforces the actual role/organisation, and keeps unapproved workers out of the dashboard.");
