import { FormEvent, useEffect, useMemo, useState } from "react";

import { applications as seedApplications, weeklyResponseData } from "./lib/sample-data";
import {
  generateOutreachDraft,
  type OutreachMessageType,
  type OutreachTone,
} from "./lib/outreach";
import type { Application, ApplicationStatus } from "./lib/types";

type View = "Dashboard" | "Resume Lab" | "AI Tools" | "Analytics";
type Modal = "resume" | "application" | null;

type Resume = {
  id: number;
  name: string;
  targetRole: string;
  updatedOn: string;
  score: number;
};

type CritiqueResult = {
  strengths: string[];
  weaknesses: string[];
  atsSuggestions: string[];
  impactSuggestions: string[];
  keywordSuggestions: string[];
};

type MatchResult = {
  percentage: number;
  matchingSkills: string[];
  missingKeywords: string[];
  improvements: string[];
};

type ThemeMode = "light" | "dark";

const LOCAL_STORAGE_KEYS = {
  applications: "ai-copilot-applications",
  resumes: "ai-copilot-resumes",
  theme: "ai-copilot-theme",
} as const;

const initialResumes: Resume[] = [
  {
    id: 1,
    name: "software-engineering-intern.pdf",
    targetRole: "Software Engineering Intern",
    updatedOn: "2026-05-14",
    score: 91,
  },
  {
    id: 2,
    name: "backend-focused-resume.pdf",
    targetRole: "Backend Engineering Intern",
    updatedOn: "2026-05-09",
    score: 86,
  },
];

const navItems: View[] = ["Dashboard", "Resume Lab", "AI Tools", "Analytics"];
const statuses: ApplicationStatus[] = ["Applied", "OA", "Interview", "Rejected", "Offer"];
const skillBank = [
  "react",
  "typescript",
  "javascript",
  "python",
  "sql",
  "aws",
  "docker",
  "fastapi",
  "node",
  "postgresql",
  "testing",
  "analytics",
  "machine learning",
  "communication",
  "leadership",
];

function toPolyline(values: number[]) {
  const maxValue = Math.max(...values);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function App() {
  const [view, setView] = useState<View>("Dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = window.localStorage.getItem(LOCAL_STORAGE_KEYS.theme);
    return savedTheme === "dark" ? "dark" : "light";
  });
  const [applications, setApplications] = useState<Application[]>(() =>
    readStoredState<Application[]>(LOCAL_STORAGE_KEYS.applications, seedApplications),
  );
  const [resumes, setResumes] = useState<Resume[]>(() =>
    readStoredState<Resume[]>(LOCAL_STORAGE_KEYS.resumes, initialResumes),
  );
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.applications, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.resumes, JSON.stringify(resumes));
  }, [resumes]);

  const summary = useMemo(() => {
    const interviews = applications.filter((application) => application.status === "Interview").length;
    const offers = applications.filter((application) => application.status === "Offer").length;
    const responses = applications.filter((application) =>
      ["OA", "Interview", "Offer"].includes(application.status),
    ).length;
    const responseRate = applications.length
      ? `${((responses / applications.length) * 100).toFixed(1)}%`
      : "0.0%";

    return {
      applications: applications.length,
      responseRate,
      interviews,
      offers,
    };
  }, [applications]);

  const progressData = statuses.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
  }));
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);

  function addResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const targetRole = String(data.get("targetRole"));

    if (!selectedResumeFile) return;

    setResumes((current) => [
      {
        id: Date.now(),
        name: selectedResumeFile.name,
        targetRole,
        updatedOn: formatToday(),
        score: 88,
      },
      ...current,
    ]);
    setSelectedResumeFile(null);
    setModal(null);
    setView("Resume Lab");
  }

  function deleteResume(id: number) {
    if (!window.confirm("Delete this resume?")) return;
    setResumes((current) => current.filter((resume) => resume.id !== id));
  }

  function closeResumeModal() {
    setSelectedResumeFile(null);
    setModal(null);
  }

  function addApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    setApplications((current) => [
      {
        id: Date.now(),
        companyName: String(data.get("companyName")),
        roleTitle: String(data.get("roleTitle")),
        status: data.get("status") as ApplicationStatus,
        appliedOn: String(data.get("appliedOn")),
        location: String(data.get("location")),
      },
      ...current,
    ]);
    setModal(null);
    setView("Dashboard");
  }

  function deleteApplication(id: number) {
    if (!window.confirm("Delete this internship application?")) return;
    setApplications((current) => current.filter((application) => application.id !== id));
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand-mark">AI</div>
        <p className="eyebrow">AI Internship</p>
        <h1>Copilot</h1>
        <nav>
          {navItems.map((item) => (
            <button
              className={item === view ? "active" : ""}
              key={item}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>{view}</h2>
          </div>
          <div className="actions">
            <button className="button ghost" onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
            <button className="button secondary" onClick={() => setModal("resume")}>
              Upload Resume
            </button>
            <button className="button primary" onClick={() => setModal("application")}>
              New Application
            </button>
          </div>
        </header>

        {view === "Dashboard" && (
          <DashboardView
            applications={applications}
            onDeleteApplication={deleteApplication}
            progressData={progressData}
            summary={summary}
          />
        )}
        {view === "Resume Lab" && (
          <ResumeLab resumes={resumes} onDeleteResume={deleteResume} onUpload={() => setModal("resume")} />
        )}
        {view === "AI Tools" && <AiTools />}
        {view === "Analytics" && (
          <AnalyticsView applications={applications} progressData={progressData} maxProgress={maxProgress} />
        )}
      </section>

      {modal === "resume" && (
        <Dialog title="Upload Resume" onClose={closeResumeModal}>
          <form className="form-grid" onSubmit={addResume}>
            <label className="file-field">
              Resume PDF
              <input
                accept="application/pdf,.pdf"
                name="resumeFile"
                onChange={(event) => setSelectedResumeFile(event.currentTarget.files?.[0] ?? null)}
                required
                type="file"
              />
              <span className={selectedResumeFile ? "file-name selected" : "file-name"}>
                {selectedResumeFile ? selectedResumeFile.name : "Choose a PDF from your device"}
              </span>
            </label>
            <label>
              Target role
              <input name="targetRole" placeholder="Software Engineering Intern" required />
            </label>
            <div className="dialog-actions">
              <button className="button ghost" type="button" onClick={closeResumeModal}>
                Cancel
              </button>
              <button className="button primary" disabled={!selectedResumeFile}>
                Save Resume
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {modal === "application" && (
        <Dialog title="New Application" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={addApplication}>
            <label>
              Company
              <input name="companyName" placeholder="Anthropic" required />
            </label>
            <label>
              Role
              <input name="roleTitle" placeholder="Product Engineering Intern" required />
            </label>
            <label>
              Status
              <select name="status" defaultValue="Applied">
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Applied on
              <input name="appliedOn" type="date" defaultValue={formatToday()} required />
            </label>
            <label>
              Location
              <input name="location" placeholder="Remote" required />
            </label>
            <div className="dialog-actions">
              <button className="button ghost" type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="button primary">Add Application</button>
            </div>
          </form>
        </Dialog>
      )}
    </main>
  );
}

function DashboardView({
  applications,
  onDeleteApplication,
  progressData,
  summary,
}: {
  applications: Application[];
  onDeleteApplication: (id: number) => void;
  progressData: { status: ApplicationStatus; count: number }[];
  summary: { applications: number; responseRate: string; interviews: number; offers: number };
}) {
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);

  return (
    <div className="dashboard-body">
      <div className="stats-grid">
        {[
          ["Applications", summary.applications, "+ active pipeline"],
          ["Response Rate", summary.responseRate, "from mock responses"],
          ["Interviews", summary.interviews, "currently in process"],
          ["Offers", summary.offers, "decisions to review"],
        ].map(([label, value, detail]) => (
          <section className="panel stat-card" key={label}>
            <p className="muted">{label}</p>
            <p className="stat-value">{value}</p>
            <p className="muted">{detail}</p>
          </section>
        ))}
      </div>

      <div className="analytics-grid">
        <ProgressPanel maxProgress={maxProgress} progressData={progressData} />
        <TrendPanel />
      </div>

      <ApplicationsTable applications={applications} onDeleteApplication={onDeleteApplication} />
    </div>
  );
}

function ResumeLab({
  resumes,
  onDeleteResume,
  onUpload,
}: {
  resumes: Resume[];
  onDeleteResume: (id: number) => void;
  onUpload: () => void;
}) {
  return (
    <div className="dashboard-body">
      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Resume Lab</p>
          <h3>Tailor each version before you apply.</h3>
          <p className="muted">
            Store role-specific resumes, compare match scores, and keep recent versions close at hand.
          </p>
        </div>
        <button className="button primary" onClick={onUpload}>
          Upload Resume
        </button>
      </section>

      <div className="resume-grid">
        {resumes.map((resume) => (
          <section className="panel resume-card" key={resume.id}>
            <button
              aria-label={`Delete resume ${resume.name}`}
              className="icon-button danger resume-delete"
              onClick={() => onDeleteResume(resume.id)}
              type="button"
            >
              <TrashIcon />
            </button>
            <div>
              <p className="eyebrow">Match score</p>
              <strong>{resume.score}%</strong>
            </div>
            <h3>{resume.name}</h3>
            <p>{resume.targetRole}</p>
            <span>Updated {resume.updatedOn}</span>
          </section>
        ))}
      </div>
    </div>
  );
}

function AiTools() {
  const [activeTool, setActiveTool] = useState<"Resume Critique" | "JD Match" | "Outreach Draft">(
    "Resume Critique",
  );
  const [critiqueFile, setCritiqueFile] = useState<File | null>(null);
  const [critiqueLoading, setCritiqueLoading] = useState(false);
  const [critique, setCritique] = useState<CritiqueResult | null>(null);
  const [jdResumeFile, setJdResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [recruiterName, setRecruiterName] = useState("Jordan");
  const [company, setCompany] = useState("OpenAI");
  const [role, setRole] = useState("Software Engineering Intern");
  const [howIFoundThem, setHowIFoundThem] = useState("I found your profile while researching the recruiting team.");
  const [backgroundSummary, setBackgroundSummary] = useState(
    "Computer science student with React, TypeScript, Python, and product engineering project experience.",
  );
  const [reasonForReachingOut, setReasonForReachingOut] = useState(
    "I recently applied and would like to briefly introduce myself.",
  );
  const [messageType, setMessageType] = useState<OutreachMessageType>("LinkedIn");
  const [tone, setTone] = useState<OutreachTone>("Warm");
  const [outreachDraft, setOutreachDraft] = useState("");
  const [copied, setCopied] = useState(false);

  function runCritique() {
    if (!critiqueFile) return;

    setCritiqueLoading(true);
    setCritique(null);
    window.setTimeout(() => {
      setCritique({
        strengths: [
          "Clear engineering focus with concise project naming.",
          "Good evidence of technical breadth across frontend and backend work.",
          "Resume length and PDF format are ATS-friendly.",
        ],
        weaknesses: [
          "Several bullets could start with stronger action verbs.",
          "Project outcomes need more business or user context.",
          "Leadership examples are less visible than technical execution.",
        ],
        atsSuggestions: [
          "Use standard section headers such as Experience, Projects, Skills, and Education.",
          "Keep dates right-aligned and avoid multi-column text boxes.",
          "Mirror exact role keywords from the posting where truthful.",
        ],
        impactSuggestions: [
          "Replace 'built dashboard' with 'built dashboard used by 40+ teammates weekly.'",
          "Quantify latency, conversion, accuracy, or time saved in each project.",
          "Add scale indicators such as records processed, users served, or APIs shipped.",
        ],
        keywordSuggestions: [
          "React",
          "TypeScript",
          "REST APIs",
          "SQL",
          "Testing",
          "Cloud deployment",
        ],
      });
      setCritiqueLoading(false);
    }, 850);
  }

  function runMatch() {
    const normalizedJd = jobDescription.toLowerCase();
    const matchingSkills = skillBank.filter((skill) => normalizedJd.includes(skill));
    const resumeHints = `${jdResumeFile?.name ?? ""} react typescript python sql testing`.toLowerCase();
    const matchedFromResume = matchingSkills.filter((skill) => resumeHints.includes(skill));
    const missingKeywords = matchingSkills.filter((skill) => !resumeHints.includes(skill));
    const percentage = matchingSkills.length
      ? Math.round((matchedFromResume.length / matchingSkills.length) * 100)
      : 0;

    setMatchResult({
      percentage,
      matchingSkills: matchedFromResume,
      missingKeywords,
      improvements: [
        missingKeywords.length
          ? `Add evidence for ${missingKeywords.slice(0, 3).join(", ")} if you have that experience.`
          : "Your resume covers the explicit skills detected in this posting.",
        "Echo the role title in your summary or project framing.",
        "Move the most relevant project closer to the top of the page.",
      ],
    });
  }

  async function generateOutreach() {
    setOutreachDraft(
      generateOutreachDraft({
        recruiterName,
        company,
        role,
        howIFoundThem,
        backgroundSummary,
        reasonForReachingOut,
        messageType,
        tone,
      }),
    );
  }

  async function copyDraft() {
    if (!outreachDraft) return;
    await navigator.clipboard.writeText(outreachDraft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="dashboard-body">
      <section className="panel hero-panel compact">
        <div>
          <p className="eyebrow">AI Tools</p>
          <h3>Frontend copilots for review, matching, and outreach.</h3>
        </div>
      </section>

      <div className="tool-tabs panel">
        {(["Resume Critique", "JD Match", "Outreach Draft"] as const).map((tool) => (
          <button className={tool === activeTool ? "active" : ""} key={tool} onClick={() => setActiveTool(tool)}>
            {tool}
          </button>
        ))}
      </div>

      {activeTool === "Resume Critique" && (
        <section className="tool-workspace">
          <div className="panel tool-form-card">
            <h3>Resume Critique</h3>
            <label className="file-field">
              Resume PDF
              <input
                accept="application/pdf,.pdf"
                onChange={(event) => setCritiqueFile(event.currentTarget.files?.[0] ?? null)}
                type="file"
              />
              <span className={critiqueFile ? "file-name selected" : "file-name"}>
                {critiqueFile ? critiqueFile.name : "Choose a PDF from your device"}
              </span>
            </label>
            <button className="button primary" disabled={!critiqueFile || critiqueLoading} onClick={runCritique}>
              {critiqueLoading ? "Analyzing..." : "Critique Resume"}
            </button>
          </div>

          <div className="feedback-grid">
            {critiqueLoading && <LoadingPanel label="Reading structure and keywords" />}
            {critique && (
              <>
                <FeedbackCard items={critique.strengths} tone="positive" title="Strengths" />
                <FeedbackCard items={critique.weaknesses} tone="warning" title="Weaknesses" />
                <FeedbackCard items={critique.atsSuggestions} tone="info" title="ATS Suggestions" />
                <FeedbackCard items={critique.impactSuggestions} tone="violet" title="Measurable Impact" />
                <FeedbackCard items={critique.keywordSuggestions} tone="teal" title="Keyword Optimization" />
              </>
            )}
          </div>
        </section>
      )}

      {activeTool === "JD Match" && (
        <section className="tool-workspace">
          <div className="panel tool-form-card">
            <h3>JD Match</h3>
            <label className="file-field">
              Resume PDF
              <input
                accept="application/pdf,.pdf"
                onChange={(event) => setJdResumeFile(event.currentTarget.files?.[0] ?? null)}
                type="file"
              />
              <span className={jdResumeFile ? "file-name selected" : "file-name"}>
                {jdResumeFile ? jdResumeFile.name : "Optional resume PDF"}
              </span>
            </label>
            <label>
              Job description
              <textarea
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste a job description mentioning React, TypeScript, Python, SQL, AWS..."
                value={jobDescription}
              />
            </label>
            <button className="button primary" disabled={!jobDescription.trim()} onClick={runMatch}>
              Analyze Match
            </button>
          </div>

          {matchResult && (
            <div className="panel match-card">
              <div className="score-row">
                <strong>{matchResult.percentage}%</strong>
                <span>resume match</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${matchResult.percentage}%` }} />
              </div>
              <TagGroup items={matchResult.matchingSkills} title="Matching skills" tone="good" />
              <TagGroup items={matchResult.missingKeywords} title="Missing keywords" tone="missing" />
              <FeedbackCard items={matchResult.improvements} tone="info" title="Suggested Improvements" />
            </div>
          )}
        </section>
      )}

      {activeTool === "Outreach Draft" && (
        <section className="tool-workspace outreach-layout">
          <div className="panel tool-form-card">
            <h3>Outreach Draft</h3>
            <label>
              Recruiter name
              <input value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)} />
            </label>
            <label>
              Company
              <input value={company} onChange={(event) => setCompany(event.target.value)} />
            </label>
            <label>
              Role
              <input value={role} onChange={(event) => setRole(event.target.value)} />
            </label>
            <label>
              How I found them
              <input value={howIFoundThem} onChange={(event) => setHowIFoundThem(event.target.value)} />
            </label>
            <label>
              Background summary
              <textarea value={backgroundSummary} onChange={(event) => setBackgroundSummary(event.target.value)} />
            </label>
            <label>
              Reason for reaching out
              <textarea
                value={reasonForReachingOut}
                onChange={(event) => setReasonForReachingOut(event.target.value)}
              />
            </label>
            <label>
              Message type
              <select
                value={messageType}
                onChange={(event) => setMessageType(event.target.value as OutreachMessageType)}
              >
                <option>LinkedIn</option>
                <option>Email</option>
                <option>Follow-up</option>
              </select>
            </label>
            <label>
              Tone
              <select value={tone} onChange={(event) => setTone(event.target.value as OutreachTone)}>
                <option>Warm</option>
                <option>Professional</option>
                <option>Casual</option>
              </select>
            </label>
            <button
              className="button primary"
              disabled={!recruiterName.trim() || !company.trim() || !role.trim() || !howIFoundThem.trim()}
              onClick={generateOutreach}
            >
              Generate Draft
            </button>
          </div>

          <div className="panel message-card">
            <div className="message-header">
              <div>
                <p className="eyebrow">{tone} style</p>
                <h3>Recruiter outreach</h3>
              </div>
              <div className="actions">
                <button className="button secondary" onClick={generateOutreach}>
                  Regenerate
                </button>
                <button className="button primary" disabled={!outreachDraft} onClick={copyDraft}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            {!outreachDraft && (
              <p className="muted">Generate a draft to preview the final message here.</p>
            )}
            {outreachDraft && <p>{outreachDraft}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function FeedbackCard({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "positive" | "warning" | "info" | "violet" | "teal";
}) {
  return (
    <section className={`panel feedback-card ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <section className="panel loading-card">
      <span />
      <p>{label}</p>
    </section>
  );
}

function TagGroup({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "good" | "missing";
}) {
  return (
    <section className="tag-section">
      <h3>{title}</h3>
      <div className="tag-row">
        {items.length ? (
          items.map((item) => (
            <span className={`tag ${tone}`} key={item}>
              {item}
            </span>
          ))
        ) : (
          <span className="muted">None detected yet.</span>
        )}
      </div>
    </section>
  );
}

function AnalyticsView({
  applications,
  progressData,
  maxProgress,
}: {
  applications: Application[];
  progressData: { status: ApplicationStatus; count: number }[];
  maxProgress: number;
}) {
  return (
    <div className="dashboard-body">
      <div className="analytics-grid">
        <ProgressPanel maxProgress={maxProgress} progressData={progressData} />
        <TrendPanel />
      </div>
      <section className="panel insight-panel">
        <h3>Pipeline Insights</h3>
        <p>
          {applications.length} applications tracked. Interview conversion is strongest after OA responses,
          while offers remain concentrated in late-April submissions.
        </p>
      </section>
    </div>
  );
}

function ProgressPanel({
  progressData,
  maxProgress,
}: {
  progressData: { status: ApplicationStatus; count: number }[];
  maxProgress: number;
}) {
  return (
    <section className="panel chart-panel">
      <h3>Application Progress</h3>
      <div className="bar-chart">
        {progressData.map((item) => (
          <div className="bar-group" key={item.status}>
            <div className="bar" style={{ height: `${(item.count / maxProgress) * 100}%` }} />
            <span className="bar-label">{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendPanel() {
  return (
    <section className="panel chart-panel">
      <h3>Response Rate Trend</h3>
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <polyline
          fill="none"
          points={toPolyline(weeklyResponseData.map((item) => item.applications))}
          stroke="#17202A"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={toPolyline(weeklyResponseData.map((item) => item.responses))}
          stroke="#0F766E"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="legend">
        <span>Applications</span>
        <span>Responses</span>
      </div>
    </section>
  );
}

function ApplicationsTable({
  applications,
  onDeleteApplication,
}: {
  applications: Application[];
  onDeleteApplication: (id: number) => void;
}) {
  return (
    <section className="panel table-panel">
      <h3>Recent Applications</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>{application.companyName}</td>
                <td>{application.roleTitle}</td>
                <td>
                  <span className={`badge ${application.status}`}>{application.status}</span>
                </td>
                <td>{application.appliedOn}</td>
                <td>{application.location}</td>
                <td>
                  <button
                    aria-label={`Delete application for ${application.companyName}`}
                    className="icon-button danger"
                    onClick={() => onDeleteApplication(application.id)}
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dialog({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="dialog panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h3>{title}</h3>
          <button aria-label="Close dialog" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4h3.25a.75.75 0 0 1 0 1.5h-.59l-.8 11.1A2.25 2.25 0 0 1 14.61 19H9.39a2.25 2.25 0 0 1-2.25-2.4L6.34 5.5h-.59a.75.75 0 0 1 0-1.5H9v-.25ZM10.75 3.5a.25.25 0 0 0-.25.25V4h3v-.25a.25.25 0 0 0-.25-.25h-2.5Zm-2.82 2L8.32 16.48a.75.75 0 0 0 .75.77h5.86a.75.75 0 0 0 .75-.77L15.07 5.5H7.93ZM10 9.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm4 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}
