import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Pencil, Trash2, FolderKanban } from "lucide-react";
import type { Project } from "@/lib/types";

type Props = {
  projects: Project[];
  current: Project;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export default function ProjectSwitcher({ projects, current, onSelect, onCreate, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="neo-chip-btn neo-chip px-4 py-2 flex items-center gap-2 text-sm font-semibold"
      >
        <FolderKanban size={15} className="text-brand" />
        <span className="max-w-[160px] truncate">{current.name}</span>
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 neo-raised rounded-2xl p-2 z-30">
          <div className="max-h-64 overflow-auto">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`group flex items-center rounded-xl px-2 ${p.id === current.id ? "neo-nav-active" : ""}`}
              >
                <button
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                  className="flex-1 text-left py-2 text-sm truncate"
                >
                  {p.name}
                </button>
                <button
                  title="Rename"
                  onClick={() => {
                    const n = prompt("Rename project", p.name);
                    if (n && n.trim()) onRename(p.id, n.trim());
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-brand"
                >
                  <Pencil size={13} />
                </button>
                {projects.length > 1 && (
                  <button
                    title="Delete"
                    onClick={() => {
                      if (confirm(`Delete “${p.name}” and all its calls & transcripts?`)) onDelete(p.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const n = prompt("New project name", "New project");
              if (n && n.trim()) {
                onCreate(n.trim());
                setOpen(false);
              }
            }}
            className="mt-1 w-full neo-btn-brand rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus size={15} /> New project
          </button>
        </div>
      )}
    </div>
  );
}
