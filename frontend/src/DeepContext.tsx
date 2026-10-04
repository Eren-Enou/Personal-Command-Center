import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { json, request, useWrite } from "./api";
import { ErrorMessage, Modal } from "./components";
import { formatDate, type Kind } from "./domains";
import type { ContextNote, ContextSpace, Topic } from "./deep-context";

function TopicEditor({
  base,
  topic,
  onClose,
}: {
  base: string;
  topic: Topic | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(topic?.name ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const save = useWrite(() =>
    request<Topic>(
      `${base}/topics${topic ? `/${topic.id}` : ""}`,
      json(topic ? "PUT" : "POST", { name, description }),
    ),
  );
  const remove = useWrite(() =>
    request<void>(`${base}/topics/${topic?.id}`, json("DELETE")),
  );
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title={topic ? "Manage Topic" : "New Topic"} onClose={onClose}>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!save.isPending) save.mutate(undefined, { onSuccess: onClose });
        }}
      >
        <label>
          Topic name
          <input
            data-autofocus
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>
        <ErrorMessage error={save.error || remove.error} />
        <div className="actions">
          <button disabled={save.isPending}>
            {topic ? "Save Topic" : "Create Topic"}
          </button>
          <button type="button" className="quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
      {topic && (
        <div className="topic-delete">
          {confirm ? (
            <>
              <p>
                Remove this Topic? Its Context Notes will remain, with their
                other Topics intact.
              </p>
              <button
                className="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(undefined, { onSuccess: onClose })}
              >
                Remove Topic
              </button>
              <button className="quiet" onClick={() => setConfirm(false)}>
                Keep Topic
              </button>
            </>
          ) : (
            <button className="quiet danger" onClick={() => setConfirm(true)}>
              Delete Topic
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function ContextComposer({
  base,
  topics,
  note,
  onSaved,
  onCancel,
}: {
  base: string;
  topics: Topic[];
  note?: ContextNote;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState(note?.body ?? "");
  const [selected, setSelected] = useState(note?.topic_ids ?? []);
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const save = useWrite(() =>
    request<ContextNote>(
      `${base}/notes${note ? `/${note.id}` : ""}`,
      json(note ? "PUT" : "POST", {
        body,
        topic_ids: selected.filter((id) => topics.some((t) => t.id === id)),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    ),
  );
  const submit = () => {
    if (body.trim() && !save.isPending)
      save.mutate(undefined, { onSuccess: onSaved });
  };
  return (
    <form
      className="context-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key === "Enter" &&
          !e.nativeEvent.isComposing
        ) {
          e.preventDefault();
          submit();
        }
      }}
    >
      <label>
        Observation
        <textarea
          ref={ref}
          required
          maxLength={100000}
          rows={3}
          placeholder="A thought about this record…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {topics.length > 0 && (
        <fieldset className="topic-choices">
          <legend>Topics (optional · choose any)</legend>
          {topics.map((topic) => (
            <label className="check" key={topic.id}>
              <input
                type="checkbox"
                checked={selected.includes(topic.id)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, topic.id]
                      : old.filter((id) => id !== topic.id),
                  )
                }
              />
              {topic.name}
            </label>
          ))}
        </fieldset>
      )}
      <details>
        <summary>Tags (optional · across your workspace)</summary>
        <label>
          Context tags
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="research, reference"
          />
        </label>
      </details>
      <ErrorMessage error={save.error} />
      <div className="actions">
        <button disabled={!body.trim() || save.isPending}>
          {note ? "Save observation" : "Save note"}
        </button>
        <button type="button" className="quiet" onClick={onCancel}>
          Cancel note
        </button>
        <span className="hint">Ctrl / ⌘ + Enter saves · Enter adds a line</span>
      </div>
    </form>
  );
}

export function DeepContext({ kind, id }: { kind: Kind; id: string }) {
  const base = `/context/${kind}/${id}`;
  const [params, setParams] = useSearchParams();
  const topicId = params.get("topic");
  const focused = params.get("context");
  const query = useQuery({
    queryKey: ["context", kind, id],
    queryFn: () => request<ContextSpace>(base),
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ContextNote | null>(null);
  const [topicEditor, setTopicEditor] = useState<Topic | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<ContextNote | null>(null);
  const remove = useWrite((noteId: string) =>
    request<void>(`${base}/notes/${noteId}`, json("DELETE")),
  );
  const notes = query.data?.context_notes ?? [];
  const topics = query.data?.topics ?? [];
  const selectedTopic = topics.find((t) => t.id === topicId);
  const shown = selectedTopic
    ? notes.filter((n) => n.topic_ids.includes(selectedTopic.id))
    : notes;
  const focusRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focused && query.data) {
      focusRef.current?.scrollIntoView?.({ block: "center" });
      focusRef.current?.focus();
    }
  }, [focused, query.data]);
  const filter = (value: string | null) => {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        next.delete("context");
        if (value) next.set("topic", value);
        else next.delete("topic");
        return next;
      },
      { replace: true },
    );
  };
  return (
    <section className="deep-context" aria-label="Deep Context">
      <div className="section-heading">
        <h2>Topics</h2>
        <button className="quiet" onClick={() => setTopicEditor(null)}>
          + Topic
        </button>
      </div>
      <p className="hint">
        Topics organize thoughts inside this record. Tags classify across your
        workspace.
      </p>
      <ErrorMessage error={query.error} />
      <div className="topic-bar" role="group" aria-label="Filter Context Notes">
        <button
          className="quiet"
          aria-pressed={!selectedTopic}
          onClick={() => filter(null)}
        >
          All ({notes.length})
        </button>
        {topics.map((topic) => (
          <div className="topic-chip" key={topic.id}>
            <button
              className="quiet"
              aria-pressed={topic.id === topicId}
              title={topic.description || undefined}
              onClick={() => filter(topic.id)}
            >
              {topic.name} ({topic.note_count})
            </button>
            <button
              className="quiet topic-manage"
              aria-label={`Manage topic ${topic.name}`}
              onClick={() => setTopicEditor(topic)}
            >
              ⋯
            </button>
          </div>
        ))}
      </div>
      {!query.isPending && topics.length === 0 && !query.error && (
        <p className="hint">
          No Topics yet. Observations can stand on their own.
        </p>
      )}
      {topicId && !selectedTopic && query.data && (
        <p className="hint">
          That Topic is no longer available. Showing all observations.
        </p>
      )}
      {selectedTopic?.description && <p>{selectedTopic.description}</p>}
      <div className="section-heading">
        <h2>Context Notes</h2>
        <button onClick={() => setAdding(true)}>Add note…</button>
      </div>
      {adding && (
        <ContextComposer
          base={base}
          topics={topics}
          onSaved={() => {
            setAdding(false);
            filter(null);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {query.isPending && <p>Loading context…</p>}
      {focused && query.data && !notes.some((n) => n.id === focused) && (
        <p className="hint">That observation is no longer available.</p>
      )}
      <div className="context-stream">
        {shown.map((note) => (
          <article
            key={note.id}
            id={`context-${note.id}`}
            tabIndex={-1}
            ref={note.id === focused ? focusRef : undefined}
            className={
              note.id === focused
                ? "context-note focused-context"
                : "context-note"
            }
            aria-label="Context Note"
          >
            {editing?.id === note.id ? (
              <ContextComposer
                base={base}
                topics={topics}
                note={note}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <p className="context-body">{note.body}</p>
                <div className="context-meta">
                  {note.topic_ids.map((topicId) => {
                    const topic = topics.find((t) => t.id === topicId);
                    return topic ? (
                      <button
                        key={topicId}
                        className="quiet"
                        onClick={() => filter(topicId)}
                      >
                        {topic.name}
                      </button>
                    ) : null;
                  })}
                  {note.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="context-meta">
                  <time>
                    {formatDate(note.created_at)}
                    {note.updated_at !== note.created_at
                      ? ` · edited ${formatDate(note.updated_at)}`
                      : ""}
                  </time>
                  <button
                    className="quiet"
                    aria-label={`Edit observation ${note.body.slice(0, 50)}`}
                    onClick={() => setEditing(note)}
                  >
                    Edit
                  </button>
                  <button
                    className="quiet danger"
                    aria-label={`Delete observation ${note.body.slice(0, 50)}`}
                    onClick={() => setDeleting(note)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {!query.isPending && !shown.length && !query.error && (
        <p className="hint">
          {selectedTopic
            ? "No observations in this Topic yet."
            : "No observations yet. Add a thought without a title or Topic."}
        </p>
      )}
      {topicEditor !== undefined && (
        <TopicEditor
          base={base}
          topic={topicEditor}
          onClose={() => setTopicEditor(undefined)}
        />
      )}
      {deleting && (
        <Modal title="Delete observation?" onClose={() => setDeleting(null)}>
          <p>
            This removes the observation and its Topic associations. Topics and
            formal Notes remain.
          </p>
          <ErrorMessage error={remove.error} />
          <div className="actions">
            <button
              className="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
            >
              Delete observation
            </button>
            <button className="quiet" onClick={() => setDeleting(null)}>
              Keep observation
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
