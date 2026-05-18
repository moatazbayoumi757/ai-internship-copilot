export type ApplicationStatus = "Applied" | "OA" | "Interview" | "Rejected" | "Offer";

export type Application = {
  id: number;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  appliedOn: string;
  location: string;
};

