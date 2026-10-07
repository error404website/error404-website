// POST /api/vault/lock  →  clears the session cookie.
import { clearCookie, json } from "../vault-lib.mjs";

export default async () => json({ ok: true }, 200, { "set-cookie": clearCookie() });

export const config = { path: "/api/vault/lock" };
