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
  const capture = useWrite((value: string) =>
    request<Entry>("/inbox", json("POST", { text: value })),
  );
  return (
    <form
      className="capture"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim() && !capture.isPending)
          capture.mutate(text, {
            onSuccess: () => {
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
        <button disabled={capture.isPending || !text.trim()}>Capture ↵</button>
      </div>
      <div className="capture-footer">
        <span>Ctrl / ⌘ + Shift + Space</span>
        <span role="status">
          {saved ? "Saved to inbox" : capture.isPending ? "Saving…" : ""}
        </span>
      </div>
      <ErrorMessage error={capture.error} />
    </form>
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
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
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
