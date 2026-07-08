"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border-2 border-neon-cyan/30 bg-black/60 p-8">
        <Link href="/" className="font-pixel text-sm text-neon-cyan tracking-widest">
          PIPER
        </Link>
        <h1 className="mt-6 font-mono text-xl">Log in</h1>
        <p className="mt-1 font-mono text-xs text-white/40">The bots are waiting for you.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="mt-4 font-mono text-xs text-white/40">
          New here?{" "}
          <Link href="/signup" className="text-neon-cyan hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
