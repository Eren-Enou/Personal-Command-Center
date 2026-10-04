import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { json, request, useEntries, useWrite } from "./api";
import {
  domains,
  entryTitle,
  formatDate,
  humanize,
  kinds,
  type Entry,
  type Kind,
} from "./domains";
import { Empty, EntryList, ErrorMessage, Modal } from "./components";
import { Editor } from "./Editor";

function ConvertForm({
  entry,
  onClose,
}: {
  entry: Entry;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<Kind>("projects");
  const [title, setTitle] = useState(entryTitle(entry).slice(0, 300));
  const navigate = useNavigate();
  const convert = useWrite(() =>
    request<{ kind: Kind; record: Entry }>(
      `/inbox/${entry.id}/convert`,
      json("POST", { target, title }),
    ),
  );
  return (
    <Modal title="Convert inbox entry" onClose={onClose}>
      <p>
        The full text and tags will be copied. The original stays in your
        archived inbox.
      </p>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          if (!convert.isPending)
            convert.mutate(undefined, {
              onSuccess: (result) =>
                navigate(`/${result.kind}/${result.record.id}`),
            });
        }}
      >
        <label>
          Record type
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as Kind)}
          >
            {kinds
              .filter((k) => k !== "inbox")
              .map((k) => (
                <option key={k} value={k}>
                  {domains[k].label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Title
          <input
            autoFocus
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <ErrorMessage error={convert.error} />
        <button disabled={convert.isPending}>Convert entry</button>
      </form>
    </Modal>
  );
}

export function RecordsPage({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const entries = useEntries(kind);
  const [creating, setCreating] = useState(false);
  const [archived, setArchived] = useState(false);
  const [filter, setFilter] = useState("");
  if (id) return <RecordDetail key={`${kind}/${id}`} kind={kind} id={id} />;
  const visible =
    entries.data?.filter(
      (entry) =>
        (kind !== "inbox" || !!entry.archived === archived) &&
        `${entryTitle(entry)} ${entry.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(filter.toLocaleLowerCase()),
    ) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>{domains[kind].label}</h1>
          <p>{domains[kind].description}</p>
        </div>
        <button onClick={() => setCreating(true)}>
          + New {domains[kind].singular}
        </button>
      </div>
      <div className="toolbar">
        <input
          aria-label={`Filter ${kind}`}
          placeholder="Filter titles or tags…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {kind === "inbox" && (
          <label className="check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Show archived
          </label>
        )}
        <span>{visible.length} items</span>
      </div>
      <ErrorMessage error={entries.error} />
      {entries.isPending ? (
        <p>Loading…</p>
      ) : visible.length ? (
        <EntryList kind={kind} entries={visible} />
      ) : (
        <Empty>
          {filter
            ? "No matching items."
            : `Nothing here yet. ${kind === "inbox" ? "Capture a thought above to get started." : `Add your first ${domains[kind].singular} when you’re ready.`}`}
        </Empty>
      )}
      {creating && (
        <Modal
          title={`New ${domains[kind].singular}`}
          onClose={() => setCreating(false)}
        >
          <Editor
            kind={kind}
            onCancel={() => setCreating(false)}
            onSaved={(entry) => {
              setCreating(false);
              navigate(`/${kind}/${entry.id}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}

function RecordDetail({ kind, id }: { kind: Kind; id: string }) {
  const record = useQuery({
    queryKey: [kind, id],
    queryFn: () => request<Entry>(`/${kind}/${id}`),
  });
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const remove = useWrite(() =>
    request<void>(`/${kind}/${id}`, json("DELETE")),
  );
  const archive = useWrite((archived: boolean) =>
    request<Entry>(`/${kind}/${id}`, json("PATCH", { archived })),
  );
  const entry = record.data;
  if (!entry)
    return (
      <>
        <ErrorMessage error={record.error} />
        {record.isPending && <p>Loading…</p>}
        <Link to={`/${kind}`}>Back to {domains[kind].label}</Link>
      </>
    );
  return (
    <>
      <Link className="back" to={`/${kind}`}>
        ← {domains[kind].label}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{domains[kind].singular.toUpperCase()}</p>
          <h1>{kind === "inbox" ? "Captured thought" : entryTitle(entry)}</h1>
          <p>
            Updated {formatDate(entry.updated_at)} · Created{" "}
            {formatDate(entry.created_at)}
          </p>
        </div>
        <button onClick={() => setEditing(true)}>Edit</button>
      </div>
      <div className="tags">
        {entry.tags.map((tag) => (
          <Link
            to={`/search?q=${encodeURIComponent(tag)}`}
            className="tag"
            key={tag}
          >
            #{tag}
          </Link>
        ))}
      </div>
      <dl className="details">
        {kind === "inbox" && (
          <div>
            <dt>Captured text</dt>
            <dd>{entry.text}</dd>
          </div>
        )}
        {domains[kind].fields
          .filter(
            (field) => entry[field.key] !== "" && entry[field.key] !== null,
          )
          .map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {field.key === "repository_url" ? (
                  <a
                    href={String(entry[field.key])}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(entry[field.key])}
                  </a>
                ) : field.key === "status" ? (
                  humanize(String(entry[field.key] ?? ""))
                ) : (
                  String(entry[field.key] ?? "")
                )}
              </dd>
            </div>
          ))}
        {entry.related_type && entry.related_id && (
          <div>
            <dt>Related record</dt>
            <dd>
              <Link to={`/${entry.related_type}/${entry.related_id}`}>
                Open related {domains[entry.related_type as Kind].singular} →
              </Link>
            </dd>
          </div>
        )}
      </dl>
      {kind === "inbox" && (
        <p className="hint">
          {entry.archived ? "Archived" : "Unclassified · ready when you are"}
        </p>
      )}
      <div className="actions">
        {kind === "inbox" && (
          <>
            <button
              className="quiet"
              disabled={archive.isPending}
              onClick={() => archive.mutate(!entry.archived)}
            >
              {entry.archived ? "Restore" : "Archive"}
            </button>
            {!entry.archived && (
              <button onClick={() => setConverting(true)}>
                Convert to record
              </button>
            )}
          </>
        )}
        <button className="danger quiet" onClick={() => setDeleting(true)}>
          Delete
        </button>
      </div>
      <ErrorMessage error={archive.error} />
      {editing && (
        <Modal
          title={`Edit ${domains[kind].singular}`}
          onClose={() => setEditing(false)}
        >
          <Editor
            kind={kind}
            entry={entry}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </Modal>
      )}
      {converting && (
        <ConvertForm entry={entry} onClose={() => setConverting(false)} />
      )}
      {deleting && (
        <Modal title="Delete this item?" onClose={() => setDeleting(false)}>
          <p>
            This permanently deletes the item. Related notes will remain and be
            detached. Activity history will remain.
          </p>
          <ErrorMessage error={remove.error} />
          <div className="actions">
            <button
              className="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => navigate(`/${kind}`),
                })
              }
            >
              Delete permanently
            </button>
            <button className="quiet" onClick={() => setDeleting(false)}>
              Keep item
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
