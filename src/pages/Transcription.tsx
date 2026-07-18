import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, FileAudio, Copy, Download, Trash2, Save, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import type { Project, Transcript, Utterance } from "@/lib/types";
import { getConfig, getTranscripts, saveTranscript, deleteTranscript } from "@/lib/api";
import KeyField from "@/components/KeyField";
import { transcribeFile, NoDeepgramKeyError, FileTooLargeError, type TranscribeProgress } from "@/lib/deepgram";
import { fmtDuration, relativeTime } from "@/lib/format";

type Draft = { filename: string; durationSeconds: number | null; utterances: Utterance[]; plainText: string };

const SPEAKER_COLORS = ["#6B4EFF", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const speakerColor = (n: number) => SPEAKER_COLORS[n % SPEAKER_COLORS.length];

export default function Transcription({ project }: { project: Project }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<TranscribeProgress | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<Transcript | null>(null);
  const [library, setLibrary] = useState<Transcript[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getConfig().then((c) => setHasKey(c.hasDeepgram)).catch(() => setHasKey(false));
  }, []);

  useEffect(() => {
    getTranscripts(project.id).then(setLibrary).catch(() => {});
    setDraft(null);
    setViewing(null);
  }, [project.id]);

  async function handleFile(file: File) {
    setProcessing(true);
    setProgress(null);
    setDraft(null);
    setViewing(null);
    try {
      const result = await transcribeFile(file, setProgress);
      setDraft({ filename: file.name, ...result });
      toast.success("Transcribed", { description: `${result.utterances.length} segments` });
    } catch (e) {
      if (e instanceof NoDeepgramKeyError) {
        setHasKey(false);
        toast.error("No Deepgram key configured");
      } else if (e instanceof FileTooLargeError) {
        toast.error("File too large", { description: "Deepgram's limit is 2 GB — that file is bigger." });
      } else {
        toast.error("Transcription failed", { description: (e as Error).message });
      }
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }

  async function save() {
    if (!draft) return;
    try {
      const saved = await saveTranscript({ projectId: project.id, ...draft });
      setLibrary((l) => [saved, ...l]);
      setDraft(null);
      toast.success("Saved to library");
    } catch (e) {
      toast.error("Couldn't save", { description: (e as Error).message });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this transcript?")) return;
    await deleteTranscript(project.id, id);
    setLibrary((l) => l.filter((t) => t.id !== id));
    if (viewing?.id === id) setViewing(null);
    toast.success("Deleted");
  }

  if (hasKey === null) return <div className="neo-inset rounded-2xl p-10 text-center text-text-muted">Loading…</div>;

  if (!hasKey) {
    return (
      <div className="neo-raised rounded-2xl p-8 max-w-xl mx-auto">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl neo-chip flex items-center justify-center">
            <KeyRound className="text-brand" />
          </div>
          <h2 className="text-h3 mb-1">Add your Deepgram key to transcribe</h2>
          <p className="text-small text-text-secondary">
            Free tier covers hundreds of hours. Paste it below — it saves instantly, no redeploy.
          </p>
        </div>
        <KeyField
          field="deepgram"
          label="Deepgram API key"
          getUrl="https://console.deepgram.com/signup"
          onSaved={async () => {
            const c = await getConfig();
            setHasKey(c.hasDeepgram);
          }}
        />
        <p className="text-[11px] text-text-muted mt-3 text-center">
          Prefer env vars? You can still set <code className="neo-chip px-1 py-0.5">DEEPGRAM_API_KEY</code> in Netlify.
        </p>
      </div>
    );
  }

  const shown: Draft | null = viewing
    ? { filename: viewing.filename, durationSeconds: viewing.durationSeconds, utterances: viewing.utterances, plainText: viewing.plainText }
    : draft;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div>
        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`neo-inset rounded-2xl p-8 text-center transition ${dragOver ? "ring-2 ring-brand" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {processing ? (
            <div className="py-4">
              <Loader2 className="mx-auto mb-3 animate-spin text-brand" />
              <div className="font-semibold">
                {progress?.phase === "upload" ? `Uploading… ${progress.pct}%` : "Transcribing…"}
              </div>
              <div className="text-small text-text-muted">
                {progress?.phase === "upload"
                  ? "Sending your file securely."
                  : "Diarizing speakers — long calls can take a minute or two."}
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="mx-auto mb-3 text-brand" size={32} />
              <div className="font-semibold mb-1">Drop an audio file, or</div>
              <button onClick={() => inputRef.current?.click()} className="neo-btn-brand rounded-xl px-5 py-2 font-semibold">
                Choose file
              </button>
              <div className="text-small text-text-muted mt-3">MP3, M4A, WAV, FLAC, OGG, WebM · any length</div>
            </>
          )}
        </div>

        {/* Result view */}
        {shown && (
          <div className="neo-raised rounded-2xl p-5 mt-4">
            <div className="flex items-center gap-2 mb-3">
              {viewing && (
                <button onClick={() => setViewing(null)} className="neo-chip-btn neo-chip p-1.5" title="Back to upload">
                  <ArrowLeft size={14} />
                </button>
              )}
              <FileAudio size={16} className="text-brand" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{shown.filename}</div>
                <div className="text-[11px] text-text-muted">
                  {fmtDuration(shown.durationSeconds)} · {shown.utterances.length} segments
                </div>
              </div>
              <ActionButtons draft={shown} isDraft={!viewing} onSave={save} />
            </div>

            <div className="neo-inset rounded-xl p-4 max-h-[55vh] overflow-auto space-y-3">
              {shown.utterances.length === 0 && (
                <div className="text-small text-text-muted text-center py-6">No speech detected.</div>
              )}
              {shown.utterances.map((u, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 w-20">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: speakerColor(u.speaker) }}
                    >
                      Speaker {u.speaker + 1}
                    </span>
                    <div className="text-[10px] font-mono text-text-muted mt-1">{fmtDuration(Math.floor(u.start))}</div>
                  </div>
                  <p className="text-[13px] text-text-secondary flex-1">{u.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Library */}
      <div className="neo-raised rounded-2xl p-3 h-fit">
        <div className="text-caption text-text-muted px-1.5 pb-2">
          Library · {library.length}
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {library.length === 0 && (
            <div className="text-small text-text-muted text-center py-6">No saved transcripts yet.</div>
          )}
          {library.map((t) => (
            <div
              key={t.id}
              className={`group relative p-3 rounded-xl ${viewing?.id === t.id ? "neo-selected" : "neo-raised neo-interactive"}`}
            >
              <button onClick={() => setViewing(t)} className="w-full text-left pr-6">
                <div className="flex items-center gap-2">
                  <FileAudio size={13} className="text-brand shrink-0" />
                  <span className="font-semibold text-sm truncate flex-1">{t.filename}</span>
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {relativeTime(t.createdAt)} · {fmtDuration(t.durationSeconds)}
                </div>
              </button>
              <button
                onClick={() => remove(t.id)}
                title="Delete"
                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-text-muted hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ draft, isDraft, onSave }: { draft: Draft; isDraft: boolean; onSave: () => void }) {
  function download(kind: "txt" | "md" | "json") {
    let body = draft.plainText;
    let type = "text/plain";
    let ext = "txt";
    if (kind === "md") {
      body = `# ${draft.filename}\n\n` + draft.utterances.map((u) => `**Speaker ${u.speaker + 1}:** ${u.text}`).join("\n\n");
      ext = "md";
    } else if (kind === "json") {
      body = JSON.stringify(draft, null, 2);
      type = "application/json";
      ext = "json";
    }
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.filename.replace(/\.[^.]+$/, "")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => navigator.clipboard.writeText(draft.plainText).then(() => toast.success("Copied"))}
        className="neo-chip-btn neo-chip p-2"
        title="Copy transcript"
      >
        <Copy size={14} />
      </button>
      <button onClick={() => download("txt")} className="neo-chip-btn neo-chip p-2" title="Download .txt">
        <Download size={14} />
      </button>
      {isDraft && (
        <button onClick={onSave} className="neo-btn-brand rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5">
          <Save size={14} /> Save
        </button>
      )}
    </div>
  );
}
