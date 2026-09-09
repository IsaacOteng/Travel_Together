import { COUNTRIES } from "../../../data/countries.js";

/**
 * The country list for the onboarding pickers.
 *
 * This used to fetch restcountries.com on mount. That API deprecated the
 * version we called and now answers every request with an error, which left
 * both pickers with an empty list — the phone-code dropdown showed nothing and
 * nationality reported "No country matching" for every search.
 *
 * The list is now bundled (see src/data/countries.js), so it is available on
 * the first render, works offline, and cannot be broken by someone else's
 * deployment. The hook keeps its old shape so callers didn't have to change.
 */
export function useCountries() {
  return { countries: COUNTRIES, loading: false, error: "" };
}
