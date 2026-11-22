import {
  CheckSquare,
  Plus,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { DailyTask, QuickNote } from "../types/app";

interface DailyTasksSectionProps {
  dailyTasks: DailyTask[];
  quickNotes: QuickNote[];
  onUpdateDailyTasks: (updater: (prev: DailyTask[]) => DailyTask[]) => void;
  onUpdateQuickNotes: (updater: (prev: QuickNote[]) => QuickNote[]) => void;
  onPrioritizeWithAi: () => void;
}

export function DailyTasksSection({
  dailyTasks,
  quickNotes,
  onUpdateDailyTasks,
  onUpdateQuickNotes,
  onPrioritizeWithAi,
}: DailyTasksSectionProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const addTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    onUpdateDailyTasks((prev) => [
      {
        id: `t-${Date.now()}`,
        title: trimmed,
        timeLabel: newTaskTime.trim() || undefined,
        priority: "normal",
        done: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setNewTaskTitle("");
    setNewTaskTime("");
  };

  const addNote = () => {
    const content = newNoteContent.trim();
    if (!content) return;
    onUpdateQuickNotes((prev) => [
      {
        id: `n-${Date.now()}`,
        title: newNoteTitle.trim() || "Catatan Cepat",
        content,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setNewNoteTitle("");
    setNewNoteContent("");
  };

  const pendingCount = dailyTasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-8">
      <section
        className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="space-y-1.5">
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            Produktivitas Harian Terhubung ke AI
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Tugas Hari Ini &amp; Catatan Cepat
          </h1>
          <p
            className="max-w-2xl text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Semua tugas dan catatan di sini otomatis terbaca oleh{" "}
            <span className="font-mono">gemini-4-hydrogen</span> saat Anda
            mengobrol, dan dapat ditambah atau diselesaikan langsung lewat chat.
          </p>
        </div>

        <button
          type="button"
          onClick={onPrioritizeWithAi}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-contrast)",
            borderRadius: "var(--radius-control)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Susun Prioritas via AI</span>
        </button>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daily Tasks Column */}
        <section
          className="space-y-4 border p-4 sm:p-6 lg:col-span-6"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold">
              Daftar Tugas ({pendingCount} belum selesai)
            </h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Nama tugas baru..."
              className="min-h-[40px] flex-1 border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
            <input
              type="text"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Jam (opsional)"
              className="min-h-[40px] w-full border px-3 py-2 text-sm sm:w-32"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
            <button
              type="button"
              onClick={addTask}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </button>
          </div>

          {dailyTasks.length === 0 ? (
            <p
              className="py-6 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Belum ada tugas. Tambahkan di atas atau minta AI di tab Asisten Chat.
            </p>
          ) : (
            <ul className="space-y-2">
              {dailyTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-3 border px-3.5 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDailyTasks((prev) =>
                        prev.map((t) =>
                          t.id === task.id ? { ...t, done: !t.done } : t,
                        ),
                      )
                    }
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  >
                    {task.done ? (
                      <CheckSquare
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: "var(--accent)" }}
                      />
                    ) : (
                      <Square
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                    <span
                      className={`min-w-0 flex-1 leading-snug ${
                        task.done ? "line-through opacity-55" : ""
                      }`}
                    >
                      <span className="font-medium">{task.title}</span>
                      {task.timeLabel ? (
                        <span
                          className="mt-0.5 block text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {task.timeLabel} · {task.priority}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDailyTasks((prev) =>
                        prev.filter((t) => t.id !== task.id),
                      )
                    }
                    className="shrink-0 p-1 opacity-60 hover:opacity-100"
                    aria-label="Hapus tugas"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick Notes Column */}
        <section
          className="space-y-4 border p-4 sm:p-6 lg:col-span-6"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div className="flex items-center gap-2">
            <StickyNote
              className="h-4 w-4"
              style={{ color: "var(--accent)" }}
            />
            <h2 className="font-display text-base font-bold">
              Catatan Cepat ({quickNotes.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Judul catatan..."
              className="min-h-[40px] w-full border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Isi catatan, ringkasan rapat, atau cuplikan penting..."
              className="w-full border px-3 py-2 text-sm leading-relaxed"
              style={{
                backgroundColor: "var(--bg-canvas)",
                borderColor: "var(--border-subtle)",
                borderRadius: "var(--radius-control)",
              }}
            />
            <button
              type="button"
              onClick={addNote}
              className="inline-flex min-h-[40px] items-center gap-1.5 px-4 py-2 text-xs font-semibold"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
                borderRadius: "var(--radius-control)",
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Simpan Catatan</span>
            </button>
          </div>

          {quickNotes.length === 0 ? (
            <p
              className="py-4 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Belum ada catatan tersimpan.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {quickNotes.map((note) => (
                <li
                  key={note.id}
                  className="border p-3.5 text-sm"
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    borderColor: "var(--border-subtle)",
                    borderRadius: "var(--radius-control)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="font-semibold">{note.title}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuickNotes((prev) =>
                          prev.filter((n) => n.id !== note.id),
                        )
                      }
                      className="shrink-0 opacity-60 hover:opacity-100"
                      aria-label="Hapus catatan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p
                    className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {note.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
