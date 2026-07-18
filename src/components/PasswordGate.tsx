import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { getConfig, verifyPassword } from "@/lib/api";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [needPassword, setNeedPassword] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getConfig()
      .then((c) => setNeedPassword(c.hasPassword))
      .catch(() => setNeedPassword(false));
  }, []);

  if (needPassword === null) return null;
  if (!needPassword || unlocked) return <>{children}</>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyPassword(password);
      setUnlocked(true);
    } catch {
      toast.error("Incorrect password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center p-6">
      <form onSubmit={submit} className="clay p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl neo-chip flex items-center justify-center">
          <Lock className="text-brand" />
        </div>
        <h1 className="text-h2 mb-1">VoiceLab</h1>
        <p className="text-small text-text-muted mb-5">This instance is password-protected.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="neo-field w-full rounded-xl px-4 py-3 mb-4 outline-none text-center"
        />
        <button
          type="submit"
          disabled={busy}
          className="neo-btn-brand w-full rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
