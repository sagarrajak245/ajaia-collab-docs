"use client";

/**
 * Login page. Demo accounts are listed for reviewers and can be filled with one click.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/utils/api-client";

const DEMO_ACCOUNTS = [
  { email: "alice@ajaia.test", name: "Alice" },
  { email: "bob@ajaia.test", name: "Bob" },
  { email: "carol@ajaia.test", name: "Carol" },
];
const DEMO_PASSWORD = "password123";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      // Only allow same-site relative redirects (prevents open-redirects via ?next=).
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/documents");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
          A
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Ajaia Docs</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your workspace</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-surface p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Demo accounts · password <code className="text-slate-700">{DEMO_PASSWORD}</code>
        </p>
        <div className="flex gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
              }}
              className="flex-1 rounded-md border border-slate-200 bg-surface px-2 py-1.5 text-sm text-slate-700 hover:bg-canvas"
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
