import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { request, type SearchResult } from "./api";
import { Empty, ErrorMessage } from "./components";
import { domains, humanize } from "./domains";

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const results = useQuery({
    queryKey: ["search", query],
    queryFn: () =>
      request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: !!query.trim(),
  });
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
          <p role="status">
            {results.isFetching
              ? "Searching…"
              : `${results.data?.length ?? 0} results for “${query}”`}
          </p>
          <ul className="search-results">
            {results.data?.map((result) => (
              <li key={`${result.kind}/${result.id}`}>
                <Link to={`/${result.kind}/${result.id}`}>
                  <span className="eyebrow">
                    {domains[result.kind].singular}
                  </span>
                  <h2>{result.title}</h2>
                  {Object.entries(result.matches).map(([field, snippet]) => (
                    <p key={field}>
                      <span className="match-field">{humanize(field)}</span>{" "}
                      {snippet}
                    </p>
                  ))}
                </Link>
              </li>
            ))}
          </ul>
          {results.data?.length === 0 && (
            <Empty>No matches yet. Try a shorter phrase or a tag.</Empty>
          )}
        </>
      )}
    </>
  );
}
