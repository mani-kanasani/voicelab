import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getConfig } from "@/lib/api";
import KeyField from "./KeyField";

export default function Settings({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<{ dHint: string | null; gHint: string | null; dEnv: boolean; gEnv: boolean }>({
    dHint: null,
    gHint: null,
    dEnv: false,
    gEnv: false,
  });

  const refresh = () =>
    getConfig()
      .then((c) => setCfg({ dHint: c.deepgramHint, gHint: c.geminiHint, dEnv: c.deepgramEnv, gEnv: c.geminiEnv }))
      .catch(() => {});

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="clay p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h3">API keys</h2>
          <button onClick={onClose} className="neo-chip-btn neo-chip p-1.5" title="Close">
            <X size={16} />
          </button>
        </div>
        <p className="text-small text-text-muted mb-5">
          Stored in your own instance and never shown again — paste a new key any time to replace one. Set a Site Password
          to protect them.
        </p>
        <div className="space-y-4">
          <KeyField
            field="deepgram"
            label="Deepgram (transcription)"
            getUrl="https://console.deepgram.com/signup"
            hint={cfg.dHint}
            env={cfg.dEnv}
            onSaved={refresh}
          />
          <KeyField
            field="gemini"
            label="Google Gemini (prompt helper)"
            getUrl="https://aistudio.google.com/apikey"
            hint={cfg.gHint}
            env={cfg.gEnv}
            onSaved={refresh}
          />
        </div>
      </div>
    </div>
  );
}
