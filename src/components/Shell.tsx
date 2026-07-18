import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Home as HomeIcon, Settings as SettingsIcon } from "lucide-react";
import type { Project } from "@/lib/types";
import { createProject, deleteProject, listProjects, renameProject } from "@/lib/api";
import ProjectSwitcher from "./ProjectSwitcher";
import Settings from "./Settings";
import Home from "@/pages/Home";
import Testing from "@/pages/Testing";
import Transcription from "@/pages/Transcription";
import PromptHelper from "@/pages/PromptHelper";

export type View = "home" | "testing" | "transcription" | "prompthelper";

export default function Shell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
    setCurrentId((cur) => (cur && list.some((p) => p.id === cur) ? cur : list[0]?.id ?? null));
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => toast.error("Could not load projects"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const current = projects.find((p) => p.id === currentId) ?? null;

  async function onCreate(name: string) {
    const p = await createProject(name);
    await refresh();
    setCurrentId(p.id);
    toast.success(`Project “${p.name}” created`);
  }
  async function onRename(id: string, name: string) {
    await renameProject(id, name);
    await refresh();
  }
  async function onDelete(id: string) {
    await deleteProject(id);
    await refresh();
    toast.success("Project deleted");
  }

  return (
    <div className="min-h-screen aurora-bg pb-10">
      <header className="glass sticky top-4 z-20 mx-4 mt-4 px-5 py-3 flex items-center gap-3 rounded-2xl">
        <button onClick={() => setView("home")} className="flex items-center gap-2 font-extrabold text-h3">
          <span className="w-8 h-8 rounded-xl neo-btn-brand flex items-center justify-center text-white text-sm">V</span>
          VoiceLab
        </button>
        {view !== "home" && (
          <button
            onClick={() => setView("home")}
            className="neo-chip-btn neo-chip px-3 py-1.5 text-small flex items-center gap-1.5 text-text-secondary"
          >
            <HomeIcon size={14} /> Home
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            title="API keys"
            className="neo-chip-btn neo-chip p-2 text-text-secondary"
          >
            <SettingsIcon size={16} />
          </button>
          {current && (
            <ProjectSwitcher
              projects={projects}
              current={current}
              onSelect={setCurrentId}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
            />
          )}
        </div>
      </header>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      <main className="max-w-6xl mx-auto px-4 md:px-6 mt-6">
        {loading ? (
          <div className="neo-inset rounded-2xl p-10 text-center text-text-muted">Loading…</div>
        ) : !current ? (
          <div className="neo-inset rounded-2xl p-10 text-center text-text-muted">No project selected.</div>
        ) : view === "home" ? (
          <Home onOpen={setView} />
        ) : view === "testing" ? (
          <Testing project={current} />
        ) : view === "transcription" ? (
          <Transcription project={current} />
        ) : (
          <PromptHelper project={current} />
        )}
      </main>
    </div>
  );
}
