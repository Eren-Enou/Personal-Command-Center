import { useQuery } from "@tanstack/react-query";
import { request, type Activity } from "./api";
import { formatDate, humanize, type Kind } from "./domains";
import { ErrorMessage } from "./components";
export function RecordActivity({ kind, id }: { kind: Kind; id: string }) {
  const activity = useQuery({
    queryKey: ["record-activity", kind, id],
    queryFn: () =>
      request<Activity[]>(`/activity?kind=${kind}&record_id=${id}&limit=6`),
  });
  return (
    <section className="record-activity">
      <h2>Recent activity</h2>
      <ErrorMessage error={activity.error} />
      {activity.data?.length ? (
        <ul>
          {activity.data.map((e) => (
            <li key={e.id}>
              <span>{humanize(e.action)}</span>
              <p>{e.title}</p>
              <time>{formatDate(e.created_at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        !activity.isPending &&
        !activity.error && <p className="hint">No recent activity.</p>
      )}
    </section>
  );
}
