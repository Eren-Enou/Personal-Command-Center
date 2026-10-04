import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { request, type SearchResult } from "./api";
import { Empty, ErrorMessage } from "./components";
import { domains, humanize, kinds } from "./domains";

export function SearchPage() {
  const [domain, setDomain] = useState("all");
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const results = useQuery({
    queryKey: ["search", query],
    queryFn: () =>
      request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: !!query.trim(),
  });
  const visible =
    results.data?.filter((r) => domain === "all" || r.kind === domain) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FIND YOUR WAY BACK</p>
          <h1>Search</h1>
          <p>
            Search titles, notes, content, and tags across your whole workspace,
            including archived items.
          </p>
        </div>
      </div>
      <ErrorMessage error={results.error} />
      {!query.trim() ? (
        <Empty>
          Use the search field above. Press Ctrl / ⌘ + K from anywhere.
        </Empty>
      ) : (
        <>
          <div
            className="mode-control"
            role="group"
            aria-label="Search domains"
          >
            {["all", ...kinds, "topics", "context_notes"].map((k) => (
              <button
                className="quiet"
                key={k}
                aria-pressed={domain === k}
                onClick={() => setDomain(k)}
              >
                {k === "all"
                  ? "All"
                  : k === "topics"
                    ? "Topics"
                    : k === "context_notes"
                      ? "Context Notes"
                      : domains[k as keyof typeof domains].label}
              </button>
            ))}
          </div>
          <p role="status">
            {results.isFetching
              ? "Searching…"
              : `${visible.length} results for “${query}”`}
          </p>
          <ul className="search-results">
            {visible.map((result) => (
              <li key={`${result.kind}/${result.id}`}>
                <Link
                  to={
                    result.kind === "topics" || result.kind === "context_notes"
                      ? `/${result.parent_type}/${result.parent_id}?${result.kind === "topics" ? "topic" : "context"}=${result.id}${result.kind === "context_notes" ? `#context-${result.id}` : ""}`
                      : `/${result.kind}/${result.id}`
                  }
                >
                  <span className="eyebrow">
                    {result.kind === "topics"
                      ? "Topic"
                      : result.kind === "context_notes"
                        ? "Context Note"
                        : domains[result.kind].singular}
                  </span>
                  <h2>
                    <Highlight text={result.title} query={query} />
                  </h2>
                  {result.kind === "topics" && (
                    <p>
                      {result.parent_title} · {result.note_count ?? 0} context{" "}
                      {result.note_count === 1 ? "note" : "notes"}
                    </p>
                  )}
                  {result.kind === "context_notes" &&
                  result.topic_names?.length ? (
                    <p>{result.topic_names.join(" · ")}</p>
                  ) : null}
                  {result.kind === "inbox" && (
                    <div className="entry-meta">
                      <span className="badge">
                        {result.archived ? "Archived" : "Active"}
                      </span>
                      {result.converted && (
                        <span className="badge">
                          Converted →{" "}
                          {result.converted_type
                            ? domains[result.converted_type].singular
                            : "destination unknown"}
                        </span>
                      )}
                    </div>
                  )}
                  {Object.entries(result.matches).map(([field, snippet]) => (
                    <p key={field}>
                      <span className="match-field">{humanize(field)}</span>{" "}
                      <Highlight text={snippet} query={query} />
                    </p>
                  ))}
                </Link>
              </li>
            ))}
          </ul>
          {!results.isFetching && visible.length === 0 && (
            <Empty>No matches yet. Try a shorter phrase or a tag.</Empty>
          )}
        </>
      )}
    </>
  );
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return text;
  const parts = [];
  let start = 0;
  let index = text.toLocaleLowerCase().indexOf(needle);
  while (index >= 0) {
    parts.push(
      text.slice(start, index),
      <mark key={index}>{text.slice(index, index + needle.length)}</mark>,
    );
    start = index + needle.length;
    index = text.toLocaleLowerCase().indexOf(needle, start);
  }
  parts.push(text.slice(start));
  return <>{parts}</>;
}
