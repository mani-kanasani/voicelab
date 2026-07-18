import { ClipboardCheck, AudioLines, ArrowRight, Sparkles } from "lucide-react";
import type { View } from "@/components/Shell";

export default function Home({ onOpen }: { onOpen: (v: View) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 neo-gradient-text inline-block">VoiceLab</h1>
        <p className="text-text-secondary mt-1">Test your voice agents and transcribe calls — pick a tool.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <button onClick={() => onOpen("testing")} className="neo-raised neo-interactive p-6 text-left">
          <div className="w-12 h-12 rounded-2xl neo-chip flex items-center justify-center mb-4">
            <ClipboardCheck className="text-brand" />
          </div>
          <h2 className="text-h3 mb-1">Testing</h2>
          <p className="text-small text-text-muted mb-4">
            Paste a webhook into your Retell agent, watch calls arrive live, and rate each one.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Open <ArrowRight size={15} />
          </span>
        </button>

        <button onClick={() => onOpen("transcription")} className="neo-raised neo-interactive p-6 text-left">
          <div className="w-12 h-12 rounded-2xl neo-chip flex items-center justify-center mb-4">
            <AudioLines className="text-brand" />
          </div>
          <h2 className="text-h3 mb-1">Transcription</h2>
          <p className="text-small text-text-muted mb-4">
            Drop in an audio file and get a diarized transcript with speaker labels, saved to your library.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Open <ArrowRight size={15} />
          </span>
        </button>

        <div className="neo-inset rounded-2xl p-5 md:col-span-2 flex items-center gap-3 text-text-muted">
          <Sparkles size={16} />
          <span className="text-small">More tools coming soon.</span>
        </div>
      </div>
    </div>
  );
}
