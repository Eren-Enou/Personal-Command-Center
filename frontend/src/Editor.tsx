import { useState } from "react";
import { json, request, useEntries, useWrite } from "./api";
import {
  domains,
  entryTitle,
  humanize,
  initialValues,
  kinds,
  toPayload,
  type Entry,
  type Kind,
  type Value,
} from "./domains";
import { ErrorMessage } from "./components";

function RelationSelect({
  kind,
  value,
  onChange,
}: {
  kind: Kind;
  value: string;
  onChange: (value: string) => void;
}) {
  const records = useEntries(kind);
  return (
    <label>
      Related record
      <select
        aria-label="Related record"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a record</option>
        {records.data?.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entryTitle(entry)}
          </option>
        ))}
      </select>
      <ErrorMessage error={records.error} />
    </label>
  );
}
export function Editor({
  kind,
  entry,
  onSaved,
  onCancel,
}: {
  kind: Kind;
  entry?: Entry;
  onSaved: (entry: Entry) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(kind, entry));
  const set = (key: string, value: Value) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const save = useWrite(() =>
    request<Entry>(
      `/${kind}${entry ? `/${entry.id}` : ""}`,
      json(entry ? "PATCH" : "POST", toPayload(kind, values)),
    ),
  );
  return (
    <form
      className="editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate(undefined, { onSuccess: onSaved });
      }}
    >
      <label>
        {kind === "inbox" ? "Text" : "Title"}
        {kind === "inbox" ? (
          <textarea
            autoFocus
            required
            maxLength={100000}
            rows={6}
            value={String(values.text)}
            onChange={(e) => set("text", e.target.value)}
          />
        ) : (
          <input
            autoFocus
            required
            maxLength={300}
            value={String(values.title)}
            onChange={(e) => set("title", e.target.value)}
          />
        )}
      </label>
      {domains[kind].fields.map((field) => (
        <label key={field.key}>
          {field.label}
          {field.options ? (
            <select
              aria-label={field.label}
              value={String(values[field.key])}
              onChange={(e) => set(field.key, e.target.value)}
            >
              {!field.options.includes(String(values[field.key])) && (
                <option value={String(values[field.key])}>
                  {String(values[field.key])}
                </option>
              )}
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {humanize(option)}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              rows={4}
              value={String(values[field.key])}
              onChange={(e) => set(field.key, e.target.value)}
            />
          ) : (
            <input
              type={field.type ?? "text"}
              min={field.type === "number" ? 0 : undefined}
              max={field.type === "number" ? 10 : undefined}
              value={String(values[field.key])}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}
        </label>
      ))}
      <label>
        Tags <span className="hint">comma-separated</span>
        <input
          value={String(values.tags)}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="personal, weekend"
        />
      </label>
      {kind === "notes" && (
        <>
          <label>
            Related type
            <select
              aria-label="Related type"
              value={String(values.related_type)}
              onChange={(e) =>
                setValues((previous) => ({
                  ...previous,
                  related_type: e.target.value,
                  related_id: "",
                }))
              }
            >
              <option value="">No relation</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {domains[k].label}
                </option>
              ))}
            </select>
          </label>
          {values.related_type && (
            <RelationSelect
              kind={values.related_type as Kind}
              value={String(values.related_id)}
              onChange={(value) => set("related_id", value)}
            />
          )}
        </>
      )}
      <ErrorMessage error={save.error} />
      <div className="actions">
        <button disabled={save.isPending}>
          {save.isPending
            ? "Saving…"
            : entry
              ? "Save changes"
              : `Create ${domains[kind].singular}`}
        </button>
        <button type="button" className="quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
