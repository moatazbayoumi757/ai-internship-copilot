import type { Application, ApplicationStatus } from "./types";

export const applications: Application[] = [
  {
    id: 1,
    companyName: "OpenAI",
    roleTitle: "Software Engineering Intern",
    status: "Applied",
    appliedOn: "2026-05-05",
    location: "San Francisco, CA",
  },
  {
    id: 2,
    companyName: "Stripe",
    roleTitle: "Backend Engineering Intern",
    status: "OA",
    appliedOn: "2026-05-08",
    location: "Remote",
  },
  {
    id: 3,
    companyName: "Figma",
    roleTitle: "Product Engineering Intern",
    status: "Interview",
    appliedOn: "2026-05-11",
    location: "San Francisco, CA",
  },
  {
    id: 4,
    companyName: "Notion",
    roleTitle: "Software Engineering Intern",
    status: "Rejected",
    appliedOn: "2026-04-29",
    location: "New York, NY",
  },
  {
    id: 5,
    companyName: "Databricks",
    roleTitle: "Software Engineering Intern",
    status: "Offer",
    appliedOn: "2026-04-23",
    location: "Mountain View, CA",
  },
];

export const progressData: { status: ApplicationStatus; count: number }[] = [
  { status: "Applied", count: 12 },
  { status: "OA", count: 6 },
  { status: "Interview", count: 4 },
  { status: "Rejected", count: 8 },
  { status: "Offer", count: 2 },
];

export const weeklyResponseData = [
  { week: "Apr 20", applications: 5, responses: 1 },
  { week: "Apr 27", applications: 8, responses: 2 },
  { week: "May 4", applications: 9, responses: 4 },
  { week: "May 11", applications: 10, responses: 5 },
];

