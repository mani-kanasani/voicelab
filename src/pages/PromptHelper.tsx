import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Wand2,
  KeyRound,
  Copy,
  Download,
  Save,
  Trash2,
  PhoneIncoming,
  PhoneOutgoing,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import type { Project, SavedPrompt } from "@/lib/types";
import { getConfig, generatePrompt, savePrompt, getPrompts, deletePrompt } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import KeyField from "@/components/KeyField";

const VERTICALS = [
  "Dental",
  "Med spa / aesthetics",
  "HVAC / home services",
  "Real estate",
  "Auto (dealership / repair)",
  "Legal",
  "Restaurant",
  "Salon / barber",
  "Property management",
  "Insurance",
  "Fitness / gym",
  "Home contractor / remodeling",
  "Other",
];

const CAPABILITIES = [
  "Appointment / calendar booking",
  "Warm transfer / escalation",
  "Knowledge-base Q&A",
  "Lead capture / qualification",
  "Take a message",
  "SMS follow-up",
  "Order / status lookup",
  "FAQ handling",
  "Pricing / quoting",
];

type Direction = "inbound" | "outbound";

export default function PromptHelper({ project }: { project: Project }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [vertical, setVertical] = useState("");
  const [direction, setDirection] = useState<Direction>("inbound");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SavedPrompt | null>(null);
  const [library, setLibrary] = useState<SavedPrompt[]>([]);

  useEffect(() => {
    getConfig().then((c) => setHasKey(c.hasGemini)).catch(() => setHasKey(false));
  }, []);

  useEffect(() => {
    getPrompts(project.id).then(setLibrary).catch(() => {});
    setResult(null);
    setViewing(null);
  }, [project.id]);

  function toggleCap(c: string) {
    setCapabilities((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  const title = `${vertical || "Voice agent"} · ${direction === "inbound" ? "Inbound" : "Outbound"}`;

  async function generate() {
    if (!description.trim()) {
      toast.error("Describe your agent first");
      return;
    }
    setGenerating(true);
    setViewing(null);
    setResult(null);
    try {
      const { prompt } = await generatePrompt({ description, direction, vertical, businessName, agentName, capabilities });
      setResult(prompt);
      toast.success("Prompt generated");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "no_key") {
        setHasKey(false);
        toast.error("No Gemini key configured");
      } else if (/429/.test(msg) || /rate/i.test(msg)) {
        toast.error("Gemini rate limit — wait a moment and try again");
      } else {
        toast.error("Generation failed", { description: msg });
      }
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!result) return;
    try {
      const saved = await savePrompt({ projectId: project.id, title, vertical, direction, capabilities, description, prompt: result });
      setLibrary((l) => [saved, ...l]);
      toast.success("Saved to library");
    } catch (e) {
      toast.error("Couldn't save", { description: (e as Error).message });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this prompt?")) return;
    await deletePrompt(project.id, id);
    setLibrary((l) => l.filter((p) => p.id !== id));
    if (viewing?.id === id) setViewing(null);
    toast.success("Deleted");
  }

  function download(text: string, name: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^\w]+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (hasKey === null) return <div className="neo-inset rounded-2xl p-10 text-center text-text-muted">Loading…</div>;

  if (!hasKey) {
    return (
      <div className="neo-raised rounded-2xl p-8 max-w-xl mx-auto">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl neo-chip flex items-center justify-center">
            <KeyRound className="text-brand" />
          </div>
          <h2 className="text-h3 mb-1">Add a Google Gemini key to generate prompts</h2>
          <p className="text-small text-text-secondary">
            Free tier is plenty. Paste it below — it saves instantly, no redeploy.
          </p>
        </div>
        <KeyField
          field="gemini"
          label="Google Gemini API key"
          getUrl="https://aistudio.google.com/apikey"
          onSaved={async () => {
            const c = await getConfig();
            setHasKey(c.hasGemini);
          }}
        />
        <p className="text-[11px] text-text-muted mt-3 text-center">
          Prefer env vars? You can still set <code className="neo-chip px-1 py-0.5">GEMINI_API_KEY</code> in Netlify.
        </p>
      </div>
    );
  }

  const shownPrompt = viewing?.prompt ?? result;
  const shownTitle = viewing?.title ?? title;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        {/* Form */}
        <div className="neo-raised rounded-2xl p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name (optional)">
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Bright Dental" className="neo-field w-full rounded-xl px-3 py-2 text-sm outline-none" />
            </Field>
            <Field label="Agent name (optional)">
              <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ava" className="neo-field w-full rounded-xl px-3 py-2 text-sm outline-none" />
            </Field>
            <Field label="Vertical">
              <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="neo-field w-full rounded-xl px-3 py-2 text-sm outline-none">
                <option value="">Choose an industry…</option>
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Direction">
              <div className="grid grid-cols-2 gap-2">
                {(["inbound", "outbound"] as Direction[]).map((d) => {
                  const active = direction === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={`rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 ${active ? "neo-btn-brand text-white" : "neo-raised neo-interactive text-text-secondary"}`}
                    >
                      {d === "inbound" ? <PhoneIncoming size={14} /> : <PhoneOutgoing size={14} />}
                      {d === "inbound" ? "Inbound" : "Outbound"}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div>
            <div className="text-caption text-text-muted mb-1.5">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              {CAPABILITIES.map((c) => {
                const active = capabilities.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCap(c)}
                    className={`text-[12px] font-medium px-3 py-1.5 rounded-full ${active ? "neo-btn-brand text-white" : "neo-chip neo-chip-btn text-text-secondary"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-caption text-text-muted mb-1.5">Describe your agent</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. Answers the front desk for a dental office. Books and reschedules cleanings, answers insurance questions from our knowledge base, and transfers dental emergencies to the on-call line."
              className="neo-field w-full rounded-xl p-3 text-[13px] outline-none"
            />
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="neo-btn-brand w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {generating ? "Writing your prompt…" : "Generate prompt"}
          </button>
        </div>

        {/* Result */}
        {shownPrompt && (
          <div className="neo-raised rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {viewing && (
                <button onClick={() => setViewing(null)} className="neo-chip-btn neo-chip p-1.5" title="Back">
                  <ArrowLeft size={14} />
                </button>
              )}
              <FileText size={16} className="text-brand" />
              <div className="font-semibold flex-1 truncate">{shownTitle}</div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => navigator.clipboard.writeText(shownPrompt).then(() => toast.success("Copied"))} className="neo-chip-btn neo-chip p-2" title="Copy">
                  <Copy size={14} />
                </button>
                <button onClick={() => download(shownPrompt, shownTitle)} className="neo-chip-btn neo-chip p-2" title="Download .md">
                  <Download size={14} />
                </button>
                {!viewing && (
                  <button onClick={save} className="neo-btn-brand rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5">
                    <Save size={14} /> Save
                  </button>
                )}
              </div>
            </div>
            <pre className="neo-inset rounded-xl p-4 max-h-[55vh] overflow-auto text-[12.5px] whitespace-pre-wrap leading-relaxed">
              {shownPrompt}
            </pre>
            <p className="text-[11px] text-text-muted mt-2">
              Paste this into your Retell agent's prompt. Facts (prices, hours) belong in Retell's Knowledge Base, not the prompt.
            </p>
          </div>
        )}
      </div>

      {/* Library */}
      <div className="neo-raised rounded-2xl p-3 h-fit">
        <div className="text-caption text-text-muted px-1.5 pb-2">Saved · {library.length}</div>
        <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {library.length === 0 && <div className="text-small text-text-muted text-center py-6">No saved prompts yet.</div>}
          {library.map((p) => (
            <div key={p.id} className={`group relative p-3 rounded-xl ${viewing?.id === p.id ? "neo-selected" : "neo-raised neo-interactive"}`}>
              <button onClick={() => setViewing(p)} className="w-full text-left pr-6">
                <div className="flex items-center gap-1.5">
                  {p.direction === "inbound" ? <PhoneIncoming size={12} className="text-info shrink-0" /> : <PhoneOutgoing size={12} className="text-success shrink-0" />}
                  <span className="font-semibold text-sm truncate">{p.title}</span>
                </div>
                <div className="text-[11px] text-text-muted mt-1">{relativeTime(p.createdAt)}</div>
              </button>
              <button onClick={() => remove(p.id)} title="Delete" className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-text-muted hover:text-danger">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-caption text-text-muted mb-1.5">{label}</div>
      {children}
    </label>
  );
}
