import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { request, useEntries, type Activity } from "./api";
import { Empty, EntryList, ErrorMessage } from "./components";
import {
  domains,
  formatDate,
  humanize,
  type Entry,
  type Kind,
} from "./domains";

function Section({
  kind,
  title,
  entries,
}: {
  kind: Kind;
  title: string;
  entries: Entry[];
}) {
  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <Link to={`/${kind}`}>View all →</Link>
      </div>
      {entries.length ? (
        <EntryList kind={kind} entries={entries.slice(0, 4)} />
      ) : (
        <Empty>
          No items yet.{" "}
          <Link to={`/${kind}`}>
            Open {domains[kind].label.toLowerCase()} →
          </Link>
        </Empty>
      )}
    </section>
  );
}
export function Dashboard() {
  const [expanded, setExpanded] = useState(false);
  const projects = useEntries("projects");
  const games = useEntries("games");
  const media = useEntries("media");
  const inbox = useEntries("inbox");
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => request<Activity[]>("/activity"),
  });
  const pending = [projects, games, media, inbox, activity].some(
    (query) => query.isPending,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERSONAL COMMAND CENTER</p>
          <h1>A little less to remember.</h1>
          <p>
            Your projects, interests, and unfinished thoughts. All in one place.
          </p>
        </div>
        <span className="local-badge">● Local workspace</span>
      </div>
      {[projects, games, media, inbox, activity].map((q, i) => (
        <ErrorMessage key={i} error={q.error} />
      ))}
      {pending && <p role="status">Loading your workspace…</p>}
      <div className="dashboard-grid">
        <Section
          kind="projects"
          title="Current projects"
          entries={projects.data?.filter((e) => e.status === "active") ?? []}
        />
        <Section
          kind="games"
          title="Currently playing"
          entries={games.data?.filter((e) => e.status === "playing") ?? []}
        />
        <Section
          kind="inbox"
          title="Waiting in your inbox"
          entries={inbox.data?.filter((e) => !e.archived) ?? []}
        />
        <Section
          kind="media"
          title="Currently reading / watching"
          entries={media.data?.filter((e) => e.status === "in_progress") ?? []}
        />
      </div>
      <section className="timeline">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <button
            className="quiet"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "Show fewer" : "Show recent 30"}
          </button>
        </div>
        {activity.data?.length ? (
          <ul>
            {activity.data.slice(0, expanded ? 30 : 6).map((event) => (
              <li key={event.id}>
                <span className="activity-dot" />
                <div>
                  {event.record_exists ? (
                    <Link to={`/${event.kind}/${event.record_id}`}>
                      <strong>{event.title}</strong>
                    </Link>
                  ) : (
                    <strong>{event.title}</strong>
                  )}
                  <span>
                    {humanize(domains[event.kind].singular).replace(/^./, (c) =>
                      c.toUpperCase(),
                    )}{" "}
                    {event.action}
                  </span>
                </div>
                <time>{formatDate(event.created_at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            Your story starts with a thought. Capture something above.
          </Empty>
        )}
      </section>
    </>
  );
}
