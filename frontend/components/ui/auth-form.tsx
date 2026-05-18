import { FormEvent, useState } from "react";

import { apiRequest } from "@/lib/api";

type AuthMode = "login" | "register";

type TokenResponse = {
  access_token: string;
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
          }),
        });
      }

      const token = await apiRequest<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("access_token", token.access_token);
      window.history.pushState({}, "", "/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to authenticate",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {mode === "register" && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Full name</span>
          <input
            className="w-full rounded-md border border-line px-3 py-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </label>
      )}
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Email</span>
        <input
          className="w-full rounded-md border border-line px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Password</span>
        <input
          className="w-full rounded-md border border-line px-3 py-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Working..."
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
