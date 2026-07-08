"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { isEmailVerified } from "@/lib/profiles/isVerified";
import type { Profile } from "@/lib/types/database";

export function VerificationSection({
  profile,
  justVerified,
  verifyError,
}: {
  profile: Profile;
  justVerified?: boolean;
  verifyError?: string | null;
}) {
  const verified = isEmailVerified(profile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    justVerified ? "Email verified! You now have the verified badge." : null
  );
  const [error, setError] = useState<string | null>(verifyError ?? null);

  async function resend() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setMessage("Verification email sent. Check your inbox (optional).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="mb-4 border-2 border-neon-cyan/30 bg-neon-cyan/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge />
          <span className="font-mono text-xs text-white/70">Your email is verified.</span>
        </div>
        {message && <p className="mt-2 font-mono text-xs text-neon-cyan">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4 border-2 border-neon-amber/40 bg-neon-amber/5 p-4">
      <p className="font-mono text-sm text-neon-amber">
        Verify your email to unlock the verified badge.
      </p>
      <p className="mt-1 font-mono text-xs text-white/40">
        Optional — you can use Piper without verifying.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={resend}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send verification email"}
      </Button>
      {message && <p className="mt-2 font-mono text-xs text-neon-cyan">{message}</p>}
      {error && <p className="mt-2 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}
