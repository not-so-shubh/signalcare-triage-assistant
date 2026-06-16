import type { CarePathway, CareRegion, UrgencyTier } from "./triageTypes";

export const DEFAULT_CARE_REGION: CareRegion = "india";

export const careTerminology = {
  uk: {
    label: "UK",
    emergencyNumber: "999",
    emergencyDepartment: "A&E",
    primaryCare: "GP"
  },
  india: {
    label: "India",
    emergencyNumber: "112 or 108",
    emergencyDepartment: "emergency department",
    primaryCare: "doctor or clinic"
  },
  us: {
    label: "US",
    emergencyNumber: "911",
    emergencyDepartment: "ER",
    primaryCare: "primary care doctor"
  }
} as const satisfies Record<
  CareRegion,
  {
    label: string;
    emergencyNumber: string;
    emergencyDepartment: string;
    primaryCare: string;
  }
>;

function emergencyDepartmentPhrase(region: CareRegion): string {
  const term = careTerminology[region].emergencyDepartment;
  if (region === "uk") return term;
  if (region === "us") return `the ${term}`;
  return `an ${term}`;
}

function emergencyDepartmentLocationPhrase(region: CareRegion): string {
  const term = careTerminology[region].emergencyDepartment;
  if (region === "uk") return `at ${term}`;
  if (region === "us") return `in the ${term}`;
  return `in an ${term}`;
}

export function localizeTierLabel(tier: UrgencyTier, region: CareRegion): string {
  const terms = careTerminology[region];
  if (tier === "Emergency services now") return `Call ${terms.emergencyNumber} now`;
  if (tier === "A&E today") return `Go to ${emergencyDepartmentPhrase(region)} today`;
  if (tier === "GP urgent appointment") return `Urgent ${terms.primaryCare} appointment`;
  if (tier === "GP routine") return `Routine ${terms.primaryCare} appointment`;
  return "Self-care with monitoring";
}

export function localizePathway(pathway: CarePathway, region: CareRegion): CarePathway {
  const terms = careTerminology[region];
  if (pathway.tier === "Emergency services now") {
    return {
      ...pathway,
      title: `Call ${terms.emergencyNumber} now`,
      message: `Based on what you shared, this may be an emergency. Please call ${terms.emergencyNumber} now. Do not drive yourself.`,
      whatToDoNow: [
        `Call ${terms.emergencyNumber} now.`,
        "Stay where you are unless the area is unsafe.",
        "Do not drive yourself.",
        "If another person is present, ask them to stay with you."
      ]
    };
  }

  if (pathway.tier === "A&E today") {
    const emergencyDepartment = emergencyDepartmentPhrase(region);
    const departmentLocation = emergencyDepartmentLocationPhrase(region);
    return {
      ...pathway,
      title: `Go to ${emergencyDepartment} today`,
      message: `These symptoms do not currently match a hard emergency override, but they should be assessed ${departmentLocation} today.`,
      whatToDoNow: [
        `Arrange same-day assessment ${departmentLocation}.`,
        "Avoid driving yourself if symptoms could worsen suddenly.",
        "Take a list of medications, allergies, and relevant medical history."
      ]
    };
  }

  if (pathway.tier === "GP urgent appointment") {
    return {
      ...pathway,
      title: `Urgent ${terms.primaryCare} appointment`,
      message: `This does not sound like an emergency based on your answers, but it should be assessed by a ${terms.primaryCare} within 24 hours.`,
      whatToDoNow: [
        `Contact a ${terms.primaryCare}, urgent care clinic, or local clinical advice line today.`,
        "Monitor symptoms and keep fluids up if appropriate.",
        "Use the provider summary when booking or speaking to a clinician."
      ]
    };
  }

  if (pathway.tier === "GP routine") {
    return {
      ...pathway,
      title: `Routine ${terms.primaryCare} appointment`,
      message: `These symptoms appear stable and non-emergency from the information provided, but a ${terms.primaryCare} review this week may be appropriate.`,
      whatToDoNow: [
        `Book a routine appointment with a ${terms.primaryCare}.`,
        "Track symptom timing, severity, triggers, and what helps.",
        "Bring medication and allergy details to the appointment."
      ]
    };
  }

  return pathway;
}
