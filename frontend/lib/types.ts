export type ApplicationStatus = "Applied" | "OA" | "Interview" | "Rejected" | "Offer";

export type ApplicationRecord = {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  appliedOn: string;
  location: string;
  createdAt: string;
  updatedAt: string;
};

export type Application = ApplicationRecord;

export type ResumeRecord = {
  id: string;
  userId: string;
  fileName: string;
  targetRole: string;
  score: number;
  createdAt: string;
  updatedAt: string;
};
