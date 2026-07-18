import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { saveSettings } from "@/lib/api";

export default function KeyField({
  field,
  label,
  getUrl,
  hint,
  env,
  onSaved,
}: {
  field: "deepgram" | "gemini";
  label: string;
  getUrl: string;
  hint?: string | null;
  env?: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!val.trim()) return;
    setBusy(true);
    try {
      await saveSettings({ [field]: val.trim() });
      setVal("");
      toast.success(`${label} saved`);
      await onSaved();
    } catch (e) {
      toast.error("Couldn't save key", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-caption text-text-muted">{label}</span>
        {hint ? (
          <span className="text-[11px] text-success font-semibold inline-flex items-center gap-1">
            <Check size={11} /> saved ····{hint}
          </span>
        ) : (
          <a href={getUrl} target="_blank" rel="noreferrer" className="text-[11px] text-brand font-semibold">
            Get a free key ↗
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={val}
          maxLength={400}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={hint ? "Paste a new key to replace" : "Paste your key here"}
          className="neo-field flex-1 rounded-xl px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={save}
          disabled={busy || !val.trim()}
          className="neo-btn-brand rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "…" : "Save"}
        </button>
      </div>
      {env && (
        <p className="text-[11px] text-text-muted mt-1.5">
          A key is also set as an environment variable — the key you save here is used instead.
        </p>
      )}
    </div>
  );
}
