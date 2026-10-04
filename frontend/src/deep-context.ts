import type { Kind } from "./domains";
export const contextParents: Kind[] = [
  "projects",
  "games",
  "media",
  "ideas",
  "utilities",
];
export interface Topic {
  id: string;
  name: string;
  description: string;
  parent_type: Kind;
  parent_id: string;
  created_at: string;
  updated_at: string;
  note_count: number;
}
export interface ContextNote {
  id: string;
  body: string;
  topic_ids: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}
export interface ContextSpace {
  topics: Topic[];
  context_notes: ContextNote[];
}
