export const kinds = [
  "projects",
  "games",
  "media",
  "ideas",
  "notes",
  "utilities",
  "inbox",
] as const;
export type Kind = (typeof kinds)[number];
export type Value = string | number | boolean | null;
export interface Entry {
  id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  title?: string;
  text?: string;
  status?: string;
  archived?: boolean;
  [key: string]: Value | string[] | undefined;
}
export interface Field {
  key: string;
  label: string;
  type?: "textarea" | "number" | "date" | "url";
  options?: string[];
  default?: string;
}
export interface Domain {
  label: string;
  singular: string;
  description: string;
  fields: Field[];
}
const notes: Field = { key: "notes", label: "Notes", type: "textarea" };
export const domains: Record<Kind, Domain> = {
  projects: {
    label: "Projects",
    singular: "project",
    description: "Keep the next step close at hand.",
    fields: [
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "status",
        label: "Status",
        options: ["active", "paused", "completed", "abandoned"],
      },
      { key: "repository_url", label: "Repository URL", type: "url" },
      { key: "next_step", label: "Next step" },
      notes,
    ],
  },
  games: {
    label: "Games",
    singular: "game",
    description: "Pick up where you left off.",
    fields: [
      {
        key: "status",
        label: "Status",
        options: ["playing", "waiting", "paused", "completed", "dropped"],
      },
      { key: "platform_or_server", label: "Platform or server" },
      {
        key: "character_or_build",
        label: "Character or build",
        type: "textarea",
      },
      { key: "current_goal", label: "Current goal" },
      { key: "release_date", label: "Release date", type: "date" },
      { key: "links", label: "Links", type: "textarea" },
      notes,
    ],
  },
  media: {
    label: "Media",
    singular: "media item",
    description: "A place in every story.",
    fields: [
      {
        key: "media_type",
        label: "Media type",
        options: ["book", "manga", "anime", "show", "video", "other"],
      },
      {
        key: "status",
        label: "Status",
        options: ["planned", "in_progress", "completed", "dropped"],
      },
      { key: "progress", label: "Progress" },
      { key: "rating", label: "Rating (0–10)", type: "number" },
      notes,
    ],
  },
  ideas: {
    label: "Ideas",
    singular: "idea",
    description: "Give unfinished thoughts somewhere to live.",
    fields: [
      { key: "body", label: "Body", type: "textarea" },
      { key: "category", label: "Category" },
      {
        key: "status",
        label: "Status",
        options: ["new", "exploring", "done", "archived"],
      },
    ],
  },
  notes: {
    label: "Notes",
    singular: "note",
    description: "Remember the details. Connect them when useful.",
    fields: [{ key: "body", label: "Body", type: "textarea" }],
  },
  utilities: {
    label: "Utilities",
    singular: "utility",
    description: "Useful things, ready when you need them.",
    fields: [
      {
        key: "utility_type",
        label: "Type",
        options: [
          "snippet",
          "command",
          "script",
          "path",
          "url",
          "instructions",
        ],
      },
      { key: "content", label: "Content", type: "textarea" },
      notes,
    ],
  },
  inbox: {
    label: "Inbox",
    singular: "inbox entry",
    description: "Capture now. Make sense of it later.",
    fields: [],
  },
};
export const entryTitle = (entry: Entry) =>
  entry.title || entry.text || "Untitled";
export const humanize = (value: string) => value.replaceAll("_", " ");
export const formatDate = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function initialValues(
  kind: Kind,
  entry?: Entry,
): Record<string, Value> {
  const values: Record<string, Value> = {
    title: entry?.title ?? "",
    text: entry?.text ?? "",
    tags: entry?.tags.join(", ") ?? "",
  };
  for (const field of domains[kind].fields)
    values[field.key] =
      (entry?.[field.key] as Value | undefined) ??
      field.default ??
      field.options?.[0] ??
      "";
  values.related_type = (entry?.related_type as string) ?? "";
  values.related_id = (entry?.related_id as string) ?? "";
  return values;
}
export function toPayload(
  kind: Kind,
  values: Record<string, Value>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    tags: String(values.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
  data[kind === "inbox" ? "text" : "title"] =
    values[kind === "inbox" ? "text" : "title"];
  for (const field of domains[kind].fields)
    data[field.key] =
      field.type === "number"
        ? values[field.key] === ""
          ? null
          : Number(values[field.key])
        : values[field.key];
  if (kind === "notes") {
    data.related_type = values.related_type || null;
    data.related_id = values.related_id || null;
  }
  return data;
}
