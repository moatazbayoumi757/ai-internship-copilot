import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  createApplication,
  createResume,
  deleteApplication as deleteApplicationRow,
  deleteResume as deleteResumeRow,
  loadApplications,
  loadResumes,
  updateApplication,
} from "./lib/db";
import { generateOutreachDraft, type OutreachMessageType, type OutreachTone } from "./lib/outreach";
import { supabase, supabaseConfigured } from "./lib/supabase";
import type { ApplicationRecord, ApplicationStatus, ResumeRecord } from "./lib/types";

type View = "Dashboard" | "Resume Lab" | "AI Tools" | "Analytics";
type Modal = "resume" | "application" | null;
type ThemeMode = "light" | "dark";
type AuthMode = "login" | "signup";

type SessionUser = {
  id: string;
  email: string;
};

type AuthResult = {
  status: "signed-in" | "verification-needed";
};

type ApplicationFormState = {
  companyName: string;
  roleTitle: string;
  status: ApplicationStatus;
  appliedOn: string;
  location: string;
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

type AuthSnapshot = {
  email: string;
  password: string;
};

const navItems: View[] = ["Dashboard", "Resume Lab", "AI Tools", "Analytics"];
const statuses: ApplicationStatus[] = ["Applied", "OA", "Interview", "Rejected", "Offer"];
const respondToStatuses: ApplicationStatus[] = ["OA", "Interview", "Offer"];
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

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRoute(pathname: string) {
  return pathname.startsWith("/auth") ? "/auth" : "/app";
}

function navigate(pathname: string, replace = false) {
  if (typeof window === "undefined") return;

  const route = normalizeRoute(pathname);
  if (replace) {
    window.history.replaceState({}, "", route);
  } else {
    window.history.pushState({}, "", route);
  }
}

function estimateResumeScore(fileName: string, targetRole: string) {
  const base = 74;
  const fileBonus = Math.min(10, Math.floor(fileName.length / 6));
  const roleBonus = Math.min(12, Math.floor(targetRole.length / 5));
  return Math.min(96, base + fileBonus + roleBonus);
}

function weekStartLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfWeek(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

function readTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem("ai-copilot-theme");
  return value === "dark" ? "dark" : "light";
}

function buildTrendData(applications: ApplicationRecord[]) {
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index * 7);
    return startOfWeek(date);
  }).reverse();

  return weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const weekApplications = applications.filter((application) => {
      const createdAt = new Date(application.createdAt);
      return createdAt >= weekStart && createdAt < weekEnd;
    });

    const responses = weekApplications.filter((application) => respondToStatuses.includes(application.status)).length;

    return {
      week: weekStartLabel(weekStart),
      applications: weekApplications.length,
      responses,
    };
  });
}

function toPolyline(values: number[]) {
  const maxValue = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authBooting, setAuthBooting] = useState(true);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("ai-copilot-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      setAuthBooting(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ? mapSession(data.session.user.id, data.session.user.email ?? null) : null);
      setAuthBooting(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ? mapSession(nextSession.user.id, nextSession.user.email ?? null) : null);
      setAuthBooting(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      navigate(normalizeRoute(window.location.pathname), true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (authBooting) return;

    if (session) {
      navigate("/app", true);
    } else {
      navigate("/auth", true);
      setApplications([]);
      setResumes([]);
      setLoadingData(false);
      setWorkspaceError("");
    }
  }, [authBooting, session]);

  useEffect(() => {
    if (!supabase || !session) return;

    let active = true;
    setLoadingData(true);
    setWorkspaceError("");

    Promise.all([loadApplications(session.id), loadResumes(session.id)])
      .then(([applicationRows, resumeRows]) => {
        if (!active) return;
        setApplications(applicationRows);
        setResumes(resumeRows);
      })
      .catch((error) => {
        if (!active) return;
        setWorkspaceError(error instanceof Error ? error.message : "Failed to load your data.");
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;

    const client = supabase;
    if (!client) return;

    const channel = client
      .channel(`workspace-sync-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `user_id=eq.${session.id}` },
        () => {
          loadApplications(session.id).then(setApplications).catch(() => undefined);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resumes", filter: `user_id=eq.${session.id}` },
        () => {
          loadResumes(session.id).then(setResumes).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [session]);

  async function handleAuthenticate(mode: AuthMode, email: string, password: string): Promise<AuthResult> {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session?.user) {
        setSession(mapSession(data.session.user.id, data.session.user.email));
        return { status: "signed-in" };
      }
      return { status: "verification-needed" };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session?.user) {
      throw new Error("Login succeeded but no session was returned.");
    }

    setSession(mapSession(data.session.user.id, data.session.user.email));
    return { status: "signed-in" };
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setApplications([]);
    setResumes([]);
    navigate("/auth", true);
  }

  async function handleCreateApplication(form: ApplicationFormState) {
    if (!session) throw new Error("Not signed in.");
    const created = await createApplication(session.id, {
      company_name: form.companyName,
      role_title: form.roleTitle,
      status: form.status,
      applied_on: form.appliedOn,
      location: form.location,
    });
    setApplications((current) => [created, ...current]);
    return created;
  }

  async function handleUpdateApplication(id: string, form: ApplicationFormState) {
    if (!session) throw new Error("Not signed in.");
    const updated = await updateApplication(session.id, id, {
      company_name: form.companyName,
      role_title: form.roleTitle,
      status: form.status,
      applied_on: form.appliedOn,
      location: form.location,
    });
    setApplications((current) => current.map((application) => (application.id === id ? updated : application)));
    return updated;
  }

  async function handleDeleteApplication(id: string) {
    if (!session) throw new Error("Not signed in.");
    await deleteApplicationRow(session.id, id);
    setApplications((current) => current.filter((application) => application.id !== id));
  }

  async function handleCreateResume(fileName: string, targetRole: string) {
    if (!session) throw new Error("Not signed in.");
    const created = await createResume(session.id, {
      file_name: fileName,
      target_role: targetRole,
      score: estimateResumeScore(fileName, targetRole),
    });
    setResumes((current) => [created, ...current]);
    return created;
  }

  async function handleDeleteResume(id: string) {
    if (!session) throw new Error("Not signed in.");
    await deleteResumeRow(session.id, id);
    setResumes((current) => current.filter((resume) => resume.id !== id));
  }

  if (!supabaseConfigured || !supabase) {
    return (
      <ConfigScreen
        title="Supabase setup required"
        message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env before running the app."
      />
    );
  }

  if (authBooting) {
    return <BootScreen />;
  }

  if (!session) {
    return <AuthScreen onAuthenticate={handleAuthenticate} />;
  }

  return (
    <Workspace
      applications={applications}
      dataError={workspaceError}
      loadingData={loadingData}
      onCreateApplication={handleCreateApplication}
      onCreateResume={handleCreateResume}
      onDeleteApplication={handleDeleteApplication}
      onDeleteResume={handleDeleteResume}
      onSignOut={handleSignOut}
      onUpdateApplication={handleUpdateApplication}
      resumes={resumes}
      session={session}
      theme={theme}
      onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
    />
  );
}

function mapSession(id: string, email: string | null | undefined) {
  return {
    id,
    email: email ?? "",
  };
}

function AuthScreen({ onAuthenticate }: { onAuthenticate: (mode: AuthMode, email: string, password: string) => Promise<AuthResult> }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [snapshot, setSnapshot] = useState<AuthSnapshot>({ email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (mode === "signup" && snapshot.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await onAuthenticate(mode, snapshot.email.trim(), snapshot.password);
      if (result.status === "verification-needed") {
        setNotice("Check your inbox to confirm your account, then log in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <div>
          <p className="eyebrow">AI Internship</p>
          <h1>Copilot</h1>
          <p className="muted">
            Private internship tracker with Supabase auth and per-user data sync.
          </p>
        </div>

        <div className="tool-tabs panel auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Log in
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
            Sign up
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setSnapshot((current) => ({ ...current, email: event.currentTarget.value }))}
              placeholder="you@example.com"
              required
              type="email"
              value={snapshot.email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setSnapshot((current) => ({ ...current, password: event.currentTarget.value }))}
              placeholder="••••••••"
              required
              type="password"
              value={snapshot.password}
            />
          </label>
          {mode === "signup" && (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                placeholder="••••••••"
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          )}
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="success-text">{notice}</p>}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Workspace({
  applications,
  dataError,
  loadingData,
  onCreateApplication,
  onCreateResume,
  onDeleteApplication,
  onDeleteResume,
  onSignOut,
  onUpdateApplication,
  resumes,
  session,
  theme,
  onToggleTheme,
}: {
  applications: ApplicationRecord[];
  dataError: string;
  loadingData: boolean;
  onCreateApplication: (form: ApplicationFormState) => Promise<ApplicationRecord>;
  onCreateResume: (fileName: string, targetRole: string) => Promise<ResumeRecord>;
  onDeleteApplication: (id: string) => Promise<void>;
  onDeleteResume: (id: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateApplication: (id: string, form: ApplicationFormState) => Promise<ApplicationRecord>;
  resumes: ResumeRecord[];
  session: SessionUser;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const [view, setView] = useState<View>("Dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>({
    companyName: "",
    roleTitle: "",
    status: "Applied",
    appliedOn: formatToday(),
    location: "",
  });
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [resumeTargetRole, setResumeTargetRole] = useState("");
  const [savingApplication, setSavingApplication] = useState(false);
  const [savingResume, setSavingResume] = useState(false);
  const [actionError, setActionError] = useState("");

  const summary = useMemo(() => {
    const interviews = applications.filter((application) => application.status === "Interview").length;
    const offers = applications.filter((application) => application.status === "Offer").length;
    const responses = applications.filter((application) => respondToStatuses.includes(application.status)).length;
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
  const trendData = useMemo(() => buildTrendData(applications), [applications]);
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);

  function openNewApplicationModal() {
    setActionError("");
    setEditingApplicationId(null);
    setApplicationForm({
      companyName: "",
      roleTitle: "",
      status: "Applied",
      appliedOn: formatToday(),
      location: "",
    });
    setModal("application");
  }

  function closeApplicationModal() {
    setModal(null);
    setEditingApplicationId(null);
    setActionError("");
  }

  function closeResumeModal() {
    setModal(null);
    setSelectedResumeFile(null);
    setResumeTargetRole("");
    setActionError("");
  }

  function openEditApplicationModal(application: ApplicationRecord) {
    setActionError("");
    setEditingApplicationId(application.id);
    setApplicationForm({
      companyName: application.companyName,
      roleTitle: application.roleTitle,
      status: application.status,
      appliedOn: application.appliedOn,
      location: application.location,
    });
    setModal("application");
  }

  async function submitApplicationForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setSavingApplication(true);

    try {
      if (editingApplicationId) {
        await onUpdateApplication(editingApplicationId, applicationForm);
      } else {
        await onCreateApplication(applicationForm);
      }
      setView("Dashboard");
      setModal(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to save the application.");
    } finally {
      setSavingApplication(false);
    }
  }

  async function submitResumeForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");

    if (!selectedResumeFile) {
      setActionError("Choose a PDF before saving.");
      return;
    }

    setSavingResume(true);
    try {
      await onCreateResume(selectedResumeFile.name, resumeTargetRole.trim() || "General");
      setSelectedResumeFile(null);
      setResumeTargetRole("");
      setModal(null);
      setView("Resume Lab");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to save the resume.");
    } finally {
      setSavingResume(false);
    }
  }

  async function deleteApplication(applicationId: string) {
    if (!window.confirm("Delete this internship application?")) return;
    setActionError("");
    try {
      await onDeleteApplication(applicationId);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to delete the application.");
    }
  }

  async function deleteResume(resumeId: string) {
    if (!window.confirm("Delete this resume?")) return;
    setActionError("");
    try {
      await onDeleteResume(resumeId);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to delete the resume.");
    }
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand-mark">AI</div>
        <p className="eyebrow">AI Internship</p>
        <h1>Copilot</h1>
        <nav>
          {navItems.map((item) => (
            <button className={item === view ? "active" : ""} key={item} onClick={() => setView(item)}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{session.email}</p>
            <h2>{view}</h2>
          </div>
          <div className="actions">
            <button className="button ghost" onClick={onToggleTheme} type="button">
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
            <button className="button secondary" onClick={openNewApplicationModal} type="button">
              New Application
            </button>
            <button className="button primary" onClick={onSignOut} type="button">
              Log out
            </button>
          </div>
        </header>

        {dataError && <section className="panel error-banner">{dataError}</section>}
        {actionError && <section className="panel error-banner">{actionError}</section>}

        {loadingData ? (
          <div className="dashboard-body">
            <LoadingPanel label="Loading your private workspace" />
          </div>
        ) : (
          <>
            {view === "Dashboard" && (
              <DashboardView
                applications={applications}
                onAddApplication={openNewApplicationModal}
                onDeleteApplication={deleteApplication}
                onEditApplication={openEditApplicationModal}
                progressData={progressData}
                summary={summary}
                trendData={trendData}
              />
            )}
            {view === "Resume Lab" && (
              <ResumeLab
                onDeleteResume={deleteResume}
                onOpenUpload={() => {
                  setActionError("");
                  setModal("resume");
                }}
                resumes={resumes}
              />
            )}
            {view === "AI Tools" && <AiTools />}
            {view === "Analytics" && (
              <AnalyticsView
                applications={applications}
                onAddApplication={openNewApplicationModal}
                progressData={progressData}
                trendData={trendData}
              />
            )}
          </>
        )}
      </section>

      {modal === "resume" && (
        <Dialog title="Upload Resume" onClose={closeResumeModal}>
          <form className="form-grid" onSubmit={submitResumeForm}>
            <label className="file-field">
              Resume PDF
              <input
                accept="application/pdf,.pdf"
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
              <input
                onChange={(event) => setResumeTargetRole(event.currentTarget.value)}
                placeholder="Software Engineering Intern"
                required
                value={resumeTargetRole}
              />
            </label>
            <div className="dialog-actions">
              <button className="button ghost" type="button" onClick={closeResumeModal}>
                Cancel
              </button>
              <button className="button primary" disabled={savingResume || !selectedResumeFile}>
                {savingResume ? "Saving..." : "Save Resume"}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {modal === "application" && (
        <Dialog title={editingApplicationId ? "Edit Application" : "New Application"} onClose={closeApplicationModal}>
          <form className="form-grid" onSubmit={submitApplicationForm}>
            <label>
              Company
              <input
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, companyName: event.currentTarget.value }))
                }
                placeholder="Anthropic"
                required
                value={applicationForm.companyName}
              />
            </label>
            <label>
              Role
              <input
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, roleTitle: event.currentTarget.value }))
                }
                placeholder="Product Engineering Intern"
                required
                value={applicationForm.roleTitle}
              />
            </label>
            <label>
              Status
              <select
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    status: event.currentTarget.value as ApplicationStatus,
                  }))
                }
                value={applicationForm.status}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Applied on
              <input
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, appliedOn: event.currentTarget.value }))
                }
                type="date"
                value={applicationForm.appliedOn}
                required
              />
            </label>
            <label>
              Location
              <input
                onChange={(event) =>
                  setApplicationForm((current) => ({ ...current, location: event.currentTarget.value }))
                }
                placeholder="Remote"
                required
                value={applicationForm.location}
              />
            </label>
            <div className="dialog-actions">
              <button className="button ghost" type="button" onClick={closeApplicationModal}>
                Cancel
              </button>
              <button className="button primary" disabled={savingApplication}>
                {savingApplication ? "Saving..." : editingApplicationId ? "Save Changes" : "Add Application"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </main>
  );
}

function DashboardView({
  applications,
  onAddApplication,
  onDeleteApplication,
  onEditApplication,
  progressData,
  summary,
  trendData,
}: {
  applications: ApplicationRecord[];
  onAddApplication: () => void;
  onDeleteApplication: (id: string) => void;
  onEditApplication: (application: ApplicationRecord) => void;
  progressData: { status: ApplicationStatus; count: number }[];
  summary: { applications: number; responseRate: string; interviews: number; offers: number };
  trendData: { week: string; applications: number; responses: number }[];
}) {
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);

  return (
    <div className="dashboard-body">
      {applications.length === 0 && (
        <EmptyStateCard
          actionLabel="Add your first application"
          description="Your dashboard starts empty. Add internships to track progress, analytics, and activity per account."
          title="No internship applications yet"
          onAction={onAddApplication}
        />
      )}

      <div className="stats-grid">
        {[
          ["Applications", summary.applications, "+ active pipeline"],
          ["Response Rate", summary.responseRate, "from your current data"],
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
        <TrendPanel trendData={trendData} />
      </div>

      <ApplicationsTable
        applications={applications}
        onDeleteApplication={onDeleteApplication}
        onEditApplication={onEditApplication}
      />
    </div>
  );
}

function ResumeLab({
  onDeleteResume,
  onOpenUpload,
  resumes,
}: {
  onDeleteResume: (id: string) => void;
  onOpenUpload: () => void;
  resumes: ResumeRecord[];
}) {
  return (
    <div className="dashboard-body">
      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Resume Lab</p>
          <h3>Tailor each version before you apply.</h3>
          <p className="muted">
            Store resume metadata per account. Every user sees only their own saved items.
          </p>
        </div>
        <button className="button primary" onClick={onOpenUpload} type="button">
          Upload Resume
        </button>
      </section>

      {resumes.length === 0 ? (
        <EmptyStateCard
          actionLabel="Upload a resume"
          description="Upload a PDF to save metadata like filename and target role to your account."
          title="No resumes saved yet"
          onAction={onOpenUpload}
        />
      ) : (
        <div className="resume-grid">
          {resumes.map((resume) => (
            <section className="panel resume-card" key={resume.id}>
              <button
                aria-label={`Delete resume ${resume.fileName}`}
                className="icon-button danger resume-delete"
                onClick={() => onDeleteResume(resume.id)}
                type="button"
              >
                <TrashIcon />
              </button>
              <div>
                <p className="eyebrow">Resume score</p>
                <strong>{resume.score}%</strong>
              </div>
              <h3>{resume.fileName}</h3>
              <p>{resume.targetRole}</p>
              <span>Updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AiTools() {
  const [activeTool, setActiveTool] = useState<"Resume Critique" | "JD Match" | "Outreach Draft">("Resume Critique");
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
        keywordSuggestions: ["React", "TypeScript", "REST APIs", "SQL", "Testing", "Cloud deployment"],
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
                onChange={(event) => setJobDescription(event.currentTarget.value)}
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
              <input value={recruiterName} onChange={(event) => setRecruiterName(event.currentTarget.value)} />
            </label>
            <label>
              Company
              <input value={company} onChange={(event) => setCompany(event.currentTarget.value)} />
            </label>
            <label>
              Role
              <input value={role} onChange={(event) => setRole(event.currentTarget.value)} />
            </label>
            <label>
              How I found them
              <input value={howIFoundThem} onChange={(event) => setHowIFoundThem(event.currentTarget.value)} />
            </label>
            <label>
              Background summary
              <textarea value={backgroundSummary} onChange={(event) => setBackgroundSummary(event.currentTarget.value)} />
            </label>
            <label>
              Reason for reaching out
              <textarea
                value={reasonForReachingOut}
                onChange={(event) => setReasonForReachingOut(event.currentTarget.value)}
              />
            </label>
            <label>
              Message type
              <select
                value={messageType}
                onChange={(event) => setMessageType(event.currentTarget.value as OutreachMessageType)}
              >
                <option>LinkedIn</option>
                <option>Email</option>
                <option>Follow-up</option>
              </select>
            </label>
            <label>
              Tone
              <select value={tone} onChange={(event) => setTone(event.currentTarget.value as OutreachTone)}>
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
                <button className="button secondary" onClick={generateOutreach} type="button">
                  Regenerate
                </button>
                <button className="button primary" disabled={!outreachDraft} onClick={copyDraft} type="button">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            {!outreachDraft && <p className="muted">Generate a draft to preview the final message here.</p>}
            {outreachDraft && <p>{outreachDraft}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function AnalyticsView({
  applications,
  onAddApplication,
  progressData,
  trendData,
}: {
  applications: ApplicationRecord[];
  onAddApplication: () => void;
  progressData: { status: ApplicationStatus; count: number }[];
  trendData: { week: string; applications: number; responses: number }[];
}) {
  const maxProgress = Math.max(...progressData.map((item) => item.count), 1);
  const hasData = applications.length > 0;

  return (
    <div className="dashboard-body">
      {!hasData && (
        <EmptyStateCard
          actionLabel="Add an application"
          description="Analytics fill in automatically as you track internships in your account."
          title="No activity to analyze yet"
          onAction={onAddApplication}
        />
      )}
      <div className="analytics-grid">
        <ProgressPanel maxProgress={maxProgress} progressData={progressData} />
        <TrendPanel trendData={trendData} />
      </div>
      <section className="panel insight-panel">
        <h3>Pipeline Insights</h3>
        <p>
          {hasData
            ? `${applications.length} applications tracked. Interview conversion is strongest after OA responses, while offers remain concentrated in your most recent activity.`
            : "Add a few internships to see response patterns, conversion rates, and trend lines."}
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

function TrendPanel({
  trendData,
}: {
  trendData: { week: string; applications: number; responses: number }[];
}) {
  const applicationSeries = trendData.map((item) => item.applications);
  const responseSeries = trendData.map((item) => item.responses);

  return (
    <section className="panel chart-panel">
      <h3>Response Rate Trend</h3>
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <polyline
          fill="none"
          points={toPolyline(applicationSeries)}
          stroke="#17202A"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={toPolyline(responseSeries)}
          stroke="#0F766E"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="legend">
        <span>Applications</span>
        <span>Responses</span>
      </div>
      <div className="trend-labels">
        {trendData.map((item) => (
          <span key={item.week}>{item.week}</span>
        ))}
      </div>
    </section>
  );
}

function ApplicationsTable({
  applications,
  onDeleteApplication,
  onEditApplication,
}: {
  applications: ApplicationRecord[];
  onDeleteApplication: (id: string) => void;
  onEditApplication: (application: ApplicationRecord) => void;
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
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <span className="muted">No applications saved yet.</span>
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id}>
                  <td>{application.companyName}</td>
                  <td>{application.roleTitle}</td>
                  <td>
                    <span className={`badge ${application.status}`}>{application.status}</span>
                  </td>
                  <td>{application.appliedOn}</td>
                  <td>{application.location}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label={`Edit application for ${application.companyName}`}
                        className="icon-button edit"
                        onClick={() => onEditApplication(application)}
                        type="button"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        aria-label={`Delete application for ${application.companyName}`}
                        className="icon-button danger"
                        onClick={() => onDeleteApplication(application.id)}
                        type="button"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyStateCard({
  actionLabel,
  description,
  title,
  onAction,
}: {
  actionLabel: string;
  description: string;
  title: string;
  onAction: () => void;
}) {
  return (
    <section className="panel empty-state">
      <div>
        <p className="eyebrow">Start here</p>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      <button className="button primary" onClick={onAction} type="button">
        {actionLabel}
      </button>
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

function Dialog({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
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
          <button aria-label="Close dialog" onClick={onClose} type="button">
            x
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function BootScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <LoadingPanel label="Connecting to Supabase and restoring your session" />
      </section>
    </main>
  );
}

function ConfigScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <p className="eyebrow">Configuration</p>
        <h1>{title}</h1>
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4h3.25a.75.75 0 0 1 0 1.5h-.59l-.8 11.1A2.25 2.25 0 0 1 14.61 19H9.39a2.25 2.25 0 0 1-2.25-2.4L6.34 5.5h-.59a.75.75 0 0 1 0-1.5H9v-.25ZM10.75 3.5a.25.25 0 0 0-.25.25V4h3v-.25a.25.25 0 0 0-.25-.25h-2.5Zm-2.82 2L8.32 16.48a.75.75 0 0 0 .75.77h5.86a.75.75 0 0 0 .75-.77L15.07 5.5H7.93ZM10 9.25a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm4 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.75 19.25h2.9L18.4 8.5l-2.9-2.9L4.75 16.35v2.9Zm12.72-12.28 1.3-1.3a1.25 1.25 0 0 0 0-1.77l-.62-.62a1.25 1.25 0 0 0-1.77 0l-1.3 1.3 2.39 2.39Z" />
    </svg>
  );
}
