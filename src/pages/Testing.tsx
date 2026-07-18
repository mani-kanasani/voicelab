import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Mic,
  Radio,
  ChevronDown,
  ChevronRight,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import type { Call, Project, RatingLatency, RatingQuality } from "@/lib/types";
import { getCalls, rateCall } from "@/lib/api";
import { fmtDuration, relativeTime } from "@/lib/format";

const QUALITY: { id: RatingQuality; label: string; color: string }[] = [
  { id: "bad", label: "Bad", color: "#EF4444" },
  { id: "weak", label: "Weak", color: "#F59E0B" },
  { id: "good", label: "Good", color: "#0EA5E9" },
  { id: "perfect", label: "Perfect", color: "#10B981" },
];
const LATENCY: { id: RatingLatency; label: string; hint: string }[] = [
  { id: "fast", label: "Fast", hint: "felt natural, no waiting" },
  { id: "normal", label: "Normal", hint: "fine" },
  { id: "slow", label: "Slow", hint: "unnatural pause before replies" },
];
const qualityColor = (q?: RatingQuality) => QUALITY.find((x) => x.id === q)?.color ?? "#8B92A8";
const callerName = (c: Call) => c.fromNumber || c.toNumber || "Unknown caller";

export default function Testing({ project }: { project: Project }) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyUnrated, setOnlyUnrated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const collapsedOnce = useRef(false);

  const webhookUrl = `${window.location.origin}/.netlify/functions/retell-webhook?token=${project.webhookToken}`;

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const c = await getCalls(project.id);
        if (alive) setCalls(c);
      } catch {
        /* poll silently */
      }
    }
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [project.id]);

  useEffect(() => {
    if (!collapsedOnce.current && calls.length > 0) {
      setPanelOpen(false);
      collapsedOnce.current = true;
    }
  }, [calls.length]);

  const filtered = useMemo(
    () => (onlyUnrated ? calls.filter((c) => !c.rating) : calls),
    [calls, onlyUnrated]
  );
  const selected = calls.find((c) => c.callId === selectedId) ?? null;

  function copy() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      {/* Webhook setup */}
      <div className="neo-raised rounded-2xl p-5">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="w-full flex items-center gap-2 text-left"
        >
          <span className="w-9 h-9 rounded-xl neo-chip flex items-center justify-center">
            <Radio size={16} className="text-brand" />
          </span>
          <div className="flex-1">
            <div className="font-semibold">Your webhook URL</div>
            <div className="text-small text-text-muted">
              Paste this into your Retell agent to start receiving calls.
            </div>
          </div>
          {panelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {panelOpen && (
          <div className="mt-4">
            <div className="flex gap-2 items-stretch">
              <code className="neo-inset rounded-xl px-3 py-2.5 text-[12.5px] font-mono flex-1 overflow-x-auto whitespace-nowrap">
                {webhookUrl}
              </code>
              <button
                onClick={copy}
                className="neo-btn-brand rounded-xl px-4 flex items-center gap-1.5 font-semibold text-sm shrink-0"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <ol className="mt-4 space-y-1.5 text-small text-text-secondary list-decimal list-inside">
              <li>In Retell, open your agent → <b>Webhook Settings</b>.</li>
              <li>Paste the URL above and save.</li>
              <li>Make a test call — it appears here within a few seconds.</li>
            </ol>
          </div>
        )}
      </div>

      {calls.length === 0 ? (
        <div className="neo-inset rounded-2xl p-12 mt-4 text-center">
          <span className="inline-block w-3 h-3 rounded-full bg-brand animate-neo-dot mb-4" />
          <div className="text-h3 mb-1">Waiting for your first call…</div>
          <p className="text-small text-text-muted">
            Copy the webhook URL above into your Retell agent, then make a call. This updates automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[360px_1fr] mt-4">
          {/* Call list */}
          <div className="neo-raised rounded-2xl p-3 h-fit">
            <div className="flex items-center justify-between px-1.5 pb-2">
              <div className="text-caption text-text-muted">
                {calls.length} call{calls.length === 1 ? "" : "s"}
              </div>
              <label className="flex items-center gap-1.5 text-small text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyUnrated}
                  onChange={(e) => setOnlyUnrated(e.target.checked)}
                  className="accent-brand"
                />
                Unrated only
              </label>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {filtered.map((c) => (
                <button
                  key={c.callId}
                  onClick={() => setSelectedId(c.callId)}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    c.callId === selectedId ? "neo-selected" : "neo-raised neo-interactive"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DirectionIcon dir={c.direction} />
                    <span className="font-semibold text-sm truncate flex-1">{callerName(c)}</span>
                    <span className="text-[11px] font-mono text-text-muted">{fmtDuration(c.durationSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-text-muted flex-1">{relativeTime(c.startedAt ?? c.receivedAt)}</span>
                    {c.rating ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                        style={{ background: qualityColor(c.rating.quality) }}
                      >
                        <Check size={10} /> {c.rating.quality}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full neo-chip text-text-muted">
                        Unrated
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-small text-text-muted py-8">All calls rated. 🎉</div>
              )}
            </div>
          </div>

          {/* Detail + rating */}
          <CallDetail
            call={selected}
            projectId={project.id}
            onRated={(updated) =>
              setCalls((cs) => cs.map((c) => (c.callId === updated.callId ? updated : c)))
            }
          />
        </div>
      )}
    </div>
  );
}

function DirectionIcon({ dir }: { dir: Call["direction"] }) {
  if (dir === "inbound") return <PhoneIncoming size={14} className="text-info shrink-0" />;
  if (dir === "outbound") return <PhoneOutgoing size={14} className="text-success shrink-0" />;
  return <Phone size={14} className="text-text-muted shrink-0" />;
}

function CallDetail({
  call,
  projectId,
  onRated,
}: {
  call: Call | null;
  projectId: string;
  onRated: (c: Call) => void;
}) {
  const [quality, setQuality] = useState<RatingQuality | null>(null);
  const [latency, setLatency] = useState<RatingLatency | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    setQuality(call?.rating?.quality ?? null);
    setLatency(call?.rating?.latency ?? null);
    setNote(call?.rating?.note ?? "");
    setRawOpen(false);
  }, [call?.callId]);

  if (!call) {
    return (
      <div className="neo-inset rounded-2xl p-12 text-center text-text-muted flex items-center justify-center">
        Select a call to review and rate it.
      </div>
    );
  }

  const needsNote = quality === "bad" || quality === "weak";
  const canSave = !!quality && (!needsNote || note.trim().length > 0) && !saving;

  async function save() {
    if (!quality) return;
    setSaving(true);
    try {
      const updated = await rateCall({ projectId, callId: call!.callId, quality, latency, note });
      onRated(updated);
      toast.success("Rating saved", { description: `Marked ${quality}` });
    } catch (e) {
      toast.error("Couldn't save rating", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="neo-raised rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-2">
        <DirectionIcon dir={call.direction} />
        <div className="flex-1">
          <div className="font-semibold text-h3">{callerName(call)}</div>
          <div className="text-[11px] font-mono text-text-muted">{call.callId}</div>
        </div>
        <div className="text-right text-small text-text-muted">
          {relativeTime(call.startedAt ?? call.receivedAt)}
          <div className="font-mono">{fmtDuration(call.durationSeconds)}</div>
        </div>
      </div>

      {/* meta chips */}
      <div className="flex flex-wrap gap-2">
        {call.outcome && <Chip>{call.outcome}</Chip>}
        {call.sentiment && <Chip>{call.sentiment}</Chip>}
        {call.callSuccessful != null && <Chip>{call.callSuccessful ? "successful" : "unsuccessful"}</Chip>}
        {call.disconnectReason && <Chip>{call.disconnectReason}</Chip>}
      </div>

      {call.recordingUrl && (
        <div>
          <div className="text-caption text-text-muted mb-1 flex items-center gap-1">
            <Mic size={12} /> Recording
          </div>
          <audio controls src={call.recordingUrl} className="w-full h-9" />
        </div>
      )}

      {call.summary && (
        <div>
          <div className="text-caption text-text-muted mb-1">Summary</div>
          <p className="text-[13px] text-text-secondary">{call.summary}</p>
        </div>
      )}

      <div>
        <div className="text-caption text-text-muted mb-1">Transcript</div>
        <div className="neo-inset rounded-xl p-3 max-h-64 overflow-auto text-[12.5px] font-mono whitespace-pre-wrap">
          {call.transcript || "Transcript not available for this call."}
        </div>
      </div>

      {/* Raw payload */}
      <div>
        <button
          onClick={() => setRawOpen((o) => !o)}
          className="text-caption text-text-muted flex items-center gap-1"
        >
          {rawOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Raw payload
        </button>
        {rawOpen && (
          <pre className="neo-inset rounded-xl p-3 max-h-64 overflow-auto text-[11px] mt-1">
            {JSON.stringify(call.rawPayload ?? {}, null, 2)}
          </pre>
        )}
      </div>

      {/* Rating */}
      <div className="border-t border-border pt-4">
        <div className="text-caption text-text-muted mb-2">Rate this call</div>
        <div className="grid grid-cols-4 gap-2">
          {QUALITY.map((opt) => {
            const active = quality === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setQuality(opt.id)}
                className={`text-xs font-semibold py-2 rounded-xl neo-raised ${active ? "" : "neo-interactive"}`}
                style={active ? { background: opt.color, color: "#fff" } : { color: opt.color }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="text-caption text-text-muted mt-3 mb-2">Latency</div>
        <div className="grid grid-cols-3 gap-2">
          {LATENCY.map((opt) => {
            const active = latency === opt.id;
            return (
              <button
                key={opt.id}
                title={opt.hint}
                onClick={() => setLatency(active ? null : opt.id)}
                className={`text-xs font-semibold py-2 rounded-xl neo-raised ${active ? "neo-btn-brand text-white" : "neo-interactive text-text-secondary"}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="text-caption text-text-muted mt-3 mb-1">
          Note {needsNote ? <span className="text-danger">· required for bad/weak</span> : <span>· optional</span>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="What went right or wrong? e.g. 'great intro, but paused too long before answering pricing'."
          className="neo-field w-full rounded-xl p-3 text-[12.5px] outline-none"
        />

        <button
          onClick={save}
          disabled={!canSave}
          className="neo-btn-brand w-full rounded-xl py-2.5 mt-3 font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : call.rating ? "Update rating" : "Save rating"}
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="neo-chip px-2.5 py-1 text-[11px] text-text-secondary">{children}</span>;
}
