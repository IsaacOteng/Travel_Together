import { StepPhotoBio } from "./StepPhotoBio";
import { StepPersonalDetails, stepPersonalRequired } from "./StepPersonalDetails";
import { StepUsernameOnly, stepUsernameRequired } from "./StepUsernameOnly";
import { StepTripTypes } from "./StepTripTypes";
import { StepEmergency } from "./StepEmergency";

export const STEPS = [
  {
    id: "photo",
    label: "Profile",
    component: StepPhotoBio,
    required: (f) => !!(f.displayName?.trim() && f.bio?.trim()),
  },
  {
    id: "personal",
    label: "Details",
    component: StepPersonalDetails,
    required: stepPersonalRequired,
  },
  {
    id: "username",
    label: "Username",
    component: StepUsernameOnly,
    required: stepUsernameRequired,
  },
  {
    id: "interests",
    label: "Interests",
    component: StepTripTypes,
    required: (f) => (f.tripTypes || []).length > 0,
    skippable: true,
  },
  {
    id: "emergency",
    label: "Emergency",
    component: StepEmergency,
    required: (f) => { const ec = f.emergencyContact || {}; return !!(ec.name?.trim() && ec.phone?.trim()); },
  },
];
