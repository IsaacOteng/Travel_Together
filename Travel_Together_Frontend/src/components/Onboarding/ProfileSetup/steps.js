import { StepPhotoBio } from "./StepPhotoBio";
import { StepPersonalDetails } from "./StepPersonalDetails";
import { StepUsernameOnly } from "./StepUsernameOnly";
import { StepTripTypes } from "./StepTripTypes";
import { StepEmergency } from "./StepEmergency";
import {
  stepPhotoRequired,
  stepPersonalRequired,
  stepUsernameRequired,
  stepEmergencyRequired,
} from "./validators";

export const STEPS = [
  {
    id: "photo",
    label: "Your profile",
    component: StepPhotoBio,
    required: stepPhotoRequired,
  },
  {
    id: "personal",
    label: "Your details",
    component: StepPersonalDetails,
    required: stepPersonalRequired,
  },
  {
    id: "username",
    label: "Your handle",
    component: StepUsernameOnly,
    required: stepUsernameRequired,
  },
  {
    id: "interests",
    label: "What you like",
    component: StepTripTypes,
    required: (f) => (f.tripTypes || []).length > 0,
    skippable: true,
  },
  {
    id: "emergency",
    label: "Emergency contact",
    component: StepEmergency,
    required: stepEmergencyRequired,
  },
];
