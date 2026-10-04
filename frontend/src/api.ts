import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Entry, Kind } from "./domains";

export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    const detail: unknown = error.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (d: { loc?: string[]; msg?: string }) =>
                  `${d.loc?.join(".") ?? ""}: ${d.msg ?? "Invalid value"}`,
              )
              .join("; ")
          : "Request failed",
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export function useEntries(kind: Kind) {
  return useQuery({
    queryKey: [kind],
    queryFn: () => request<Entry[]>(`/${kind}`),
  });
}
export function useWrite<T, V>(operation: (value: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: operation,
    onSuccess: () => client.invalidateQueries(),
  });
}
export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
export interface Activity {
  id: string;
  kind: Kind;
  record_id: string;
  title: string;
  action: string;
  record_exists: boolean;
  created_at: string;
}
export interface SearchResult {
  id: string;
  kind: Kind | "topics" | "context_notes";
  parent_type?: Kind | null;
  parent_id?: string | null;
  parent_title?: string | null;
  topic_names?: string[];
  note_count?: number | null;
  title: string;
  matches: Record<string, string>;
  archived?: boolean | null;
  converted?: boolean;
  converted_type?: Kind | null;
}
export interface Settings {
  name: string;
  version: string;
  database: string;
  counts: Record<string, number>;
}
