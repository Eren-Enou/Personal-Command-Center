import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { json, request, useWrite } from "./api";
import {
  entryTitle,
  formatDate,
  humanize,
  type Entry,
  type Kind,
} from "./domains";

export function ErrorMessage({ error }: { error: Error | null }) {
  return error ? (
    <p role="alert" className="error">
      {error.message}
    </p>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function QuickCapture() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [latest, setLatest] = useState<Entry | null>(null);
  const [tagging, setTagging] = useState(false);
  const capture = useWrite((value: string) =>
    request<Entry>("/inbox", json("POST", { text: value })),
  );
  return (
    <>
      <form
        className="capture"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim() && !capture.isPending)
            capture.mutate(text, {
              onSuccess: (entry) => {
                setLatest(entry);
                setTagging(false);
                setText((current) => (current === text ? "" : current));
                setSaved(true);
              },
            });
        }}
      >
        <label htmlFor="quick-capture">
          Quick capture <span>Save a thought. Organize it later.</span>
        </label>
        <div className="input-row">
          <input
            id="quick-capture"
            placeholder="What’s on your mind?"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            required
            maxLength={100000}
          />
          <button disabled={capture.isPending || !text.trim()}>
            Capture ↵
          </button>
        </div>
        <div className="capture-footer">
          <span>Ctrl / ⌘ + Shift + Space</span>
          <span role="status">
            {saved ? "Saved to inbox" : capture.isPending ? "Saving…" : ""}
          </span>
        </div>
        {saved && latest && (
          <button
            type="button"
            className="quiet"
            onClick={() => setTagging(true)}
          >
            Add tags to saved capture
          </button>
        )}
        <ErrorMessage error={capture.error} />
      </form>
      {tagging && latest && (
        <Modal title="Tag saved capture" onClose={() => setTagging(false)}>
          <TagForm entry={latest} onSaved={() => setTagging(false)} />
        </Modal>
      )}
    </>
  );
}
export function EntryList({ kind, entries }: { kind: Kind; entries: Entry[] }) {
  return (
    <ul className="entry-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link to={`/${kind}/${entry.id}`}>
            <div className="entry-heading">
              <strong>{entryTitle(entry)}</strong>
              {entry.status && (
                <span className="badge">{humanize(entry.status)}</span>
              )}
            </div>
            <p>
              {String(
                (kind === "media"
                  ? `${humanize(String(entry.media_type || "media"))} · ${entry.progress || "No progress recorded"}`
                  : "") ||
                  entry.next_step ||
                  entry.current_goal ||
                  entry.progress ||
                  entry.description ||
                  entry.body ||
                  entry.content ||
                  entry.notes ||
                  "",
              )}
            </p>
            <div className="entry-meta">
              <span>{formatDate(entry.updated_at)}</span>
              {entry.tags.map((tag) => (
                <span className="tag" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>(
        "[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
      )
      ?.focus();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]",
          ) ?? [],
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="quiet"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function TagForm({
  entry,
  onSaved,
}: {
  entry: Entry;
  onSaved: () => void;
}) {
  const [tags, setTags] = useState(entry.tags.join(", "));
  const save = useWrite(() =>
    request<Entry>(
      `/inbox/${entry.id}`,
      json("PATCH", {
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    ),
  );
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!save.isPending) save.mutate(undefined, { onSuccess: onSaved });
      }}
    >
      <p>Tags are optional. Your thought is already saved.</p>
      <label>
        Tags
        <input
          data-autofocus
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="personal, weekend"
        />
      </label>
      <ErrorMessage error={save.error} />
      <button disabled={save.isPending}>Save tags</button>
    </form>
  );
}
