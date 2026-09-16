/* Gate predicates for the onboarding steps — what has to be true before
   Continue lights up.

   These used to live beside their step components, which meant each of those
   files exported both a component and a plain function; Fast Refresh can't
   handle a mixed module, so editing a step did a full reload instead of a hot
   swap. Keeping them here also puts the rules for the whole flow on one
   screen, where it's obvious that the two phone fields now agree. */

const UN_RE = /^[a-z0-9._]{3,20}$/;

/** Digits only, ignoring spaces, dashes and the dial code. */
const digits = (s) => (s || "").replace(/\D/g, "");

/** 7–15 digits is the E.164 national-number range. */
export const isPhoneValid = (s) => {
  const d = digits(s);
  return d.length >= 7 && d.length <= 15;
};

export const ageFrom = (dob) =>
  dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600e3)) : null;

export const stepPhotoRequired = (f) =>
  !!(f.displayName?.trim() && f.bio?.trim());

export const stepPersonalRequired = (f) => {
  const age = ageFrom(f.dob);
  return !!(
    f.dob && age >= 13 && age <= 120 &&
    f.gender &&
    f.nationality &&
    f.city?.trim() &&
    isPhoneValid(f.phoneNumber)
  );
};

/* Format alone used to be enough here, so a handle the server had already
   said was taken still lit up Continue — you'd find out via a generic save
   error one screen later. "checking" blocks too, since that's the window the
   old version slipped through. */
export const stepUsernameRequired = (f) =>
  UN_RE.test(f.username || "") && f.usernameStatus === "available";

export const stepEmergencyRequired = (f) => {
  const ec = f.emergencyContact || {};
  return !!(ec.name?.trim() && isPhoneValid(ec.phone));
};

export { UN_RE };
