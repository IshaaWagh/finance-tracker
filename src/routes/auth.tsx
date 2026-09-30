import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/auth")({
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
  setError(error.message);
} else {
  setMessage("Please check your email and click the confirmation link to verify your account.");
}
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate({ to: "/" });
      }
    }

    setLoading(false);
  }

  

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">
          Finance Tracker
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
  {mode === "login" ? "Log in to your account" : "Create your account"}
</p>

       <form onSubmit={handleSubmit} className="mt-6 space-y-4">
  <div>
    <label className="block text-sm font-medium text-foreground">
      Email
    </label>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@example.com"
      className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
      required
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-foreground">
      Password
    </label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="••••••••"
      className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5"
      required
      minLength={6}
    />
  </div>

  <button
    type="submit"
    disabled={loading}
    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
  >
    {loading
      ? "Please wait..."
      : mode === "login"
        ? "Login"
        : "Create Account"}
  </button>
</form>

        {message && (
          <p className="mt-4 text-sm text-green-600">{message}</p>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
<button
  type="button"
  onClick={() => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setMessage("");
  }}
  className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
>
  {mode === "login"
    ? "Don't have an account? Register"
    : "Already have an account? Login"}
</button>
      </div>
    </div>
  );
}