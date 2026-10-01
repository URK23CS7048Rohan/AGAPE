/**
 * Stable keys that link member actions (RSVPs, gifts, group chats) to content edited in /admin.
 * Must match `public.slugify()` in the database and `AgapeKeys` on the website.
 */
export const slug = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const eventKey = (e: { title?: string; day?: string; month?: string }) => slug(`${e.title || ""} ${e.day || ""} ${e.month || ""}`);
export const campaignKey = (c: { title?: string; accent?: string }) => slug(`${c.title || ""} ${c.accent || ""}`);
export const groupKey = (name: string) => slug(name);
