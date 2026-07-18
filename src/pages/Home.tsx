import { ClipboardCheck, AudioLines, Wand2, ArrowRight } from "lucide-react";
import type { View } from "@/components/Shell";

const TOOLS: { view: View; icon: typeof ClipboardCheck; title: string; desc: string }[] = [
  {
    view: "testing",
    icon: ClipboardCheck,
    title: "Testing",
    desc: "Paste a webhook into your Retell agent, watch calls arrive live, and rate each one.",
  },
  {
    view: "transcription",
    icon: AudioLines,
    title: "Transcription",
    desc: "Drop in an audio file and get a diarized transcript with speaker labels, saved to your library.",
  },
  {
    view: "prompthelper",
    icon: Wand2,
    title: "Prompt Helper",
    desc: "Describe your agent, pick its capabilities, and generate a best-practice Retell prompt.",
  },
];

export default function Home({ onOpen }: { onOpen: (v: View) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 neo-gradient-text inline-block">VoiceLab</h1>
        <p className="text-text-secondary mt-1">Build, test, and transcribe voice agents — pick a tool.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {TOOLS.map(({ view, icon: Icon, title, desc }) => (
          <button key={view} onClick={() => onOpen(view)} className="neo-raised neo-interactive p-6 text-left">
            <div className="w-12 h-12 rounded-2xl neo-chip flex items-center justify-center mb-4">
              <Icon className="text-brand" />
            </div>
            <h2 className="text-h3 mb-1">{title}</h2>
            <p className="text-small text-text-muted mb-4">{desc}</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Open <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
