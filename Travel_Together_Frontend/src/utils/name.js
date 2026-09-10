/**
 * Single source of truth for turning a user-shaped object into text on screen.
 *
 * Every call site used to inline its own version of this, which is why the same
 * person could show up as "Traveller" on one screen, "Member" on another and as
 * their raw @handle on a third.
 *
 * The handle is deliberately NOT a fallback for a name. It is an identifier, not
 * a name, and on an account that never finished onboarding it is a system-
 * generated placeholder. Profiles render the handle separately as @handle, so
 * nothing is lost by keeping the two apart.
 */

/** Full name for display, or `fallback` when the account has no name set. */
export function displayName(person, fallback = "Traveller") {
  if (!person) return fallback;
  const full = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || fallback;
}

/** 1–2 letter initials for avatars, or "?" when there is no name to work from. */
export function initials(person) {
  const full = displayName(person, "");
  if (!full) return "?";
  const [first = "", second = ""] = full.split(/\s+/);
  return ((first[0] || "") + (second[0] || "")).toUpperCase() || "?";
}
