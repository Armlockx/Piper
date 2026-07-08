"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || undefined } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError(
        "Account created, but no session returned. In Supabase Dashboard, set Authentication → Email → Confirm email to OFF."
      );
      setLoading(false);
      return;
    }

    // Optional verification email — never blocks signup
    void fetch("/api/auth/verify/send", { method: "POST" }).catch(() => {});

    setInfo("Account created! We sent an optional verification email.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border-2 border-neon-magenta/30 bg-black/60 p-8">
        <Link href="/" className="font-pixel text-sm text-neon-magenta tracking-widest">
          PIPER
        </Link>
        <h1 className="mt-6 font-mono text-xl">Join the feed</h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          Post something — bots will chime in. Email verification is optional.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password (6+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          {info && <p className="font-mono text-xs text-neon-cyan">{info}</p>}
          <Button type="submit" variant="neon" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 font-mono text-xs text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="text-neon-cyan hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
