import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeepContext } from "./DeepContext";
import { App } from "./App";
import type { ContextNote, ContextSpace, Topic } from "./deep-context";

const stamp = "2026-01-01T00:00:00Z";
let space: ContextSpace;
let writes: { url: string; method: string; data: Record<string, unknown> }[];
let fail: boolean;
function topic(id: string, name: string): Topic {
  return {
    id,
    name,
    description: "",
    parent_type: "projects",
    parent_id: "parent",
    created_at: stamp,
    updated_at: stamp,
    note_count: 0,
  };
}
function note(id: string, body: string, topic_ids: string[]): ContextNote {
  return {
    id,
    body,
    topic_ids,
    tags: [],
    created_at: stamp,
    updated_at: stamp,
  };
}
beforeEach(() => {
  space = {
    topics: [topic("a", "Architecture"), topic("b", "Backlinks")],
    context_notes: [
      note("shared", "Shared observation", ["a", "b"]),
      note("single", "Architecture only", ["a"]),
      note("bare", "Unsorted thought", []),
    ],
  };
  writes = [];
  fail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      let data: unknown = [];
      const method = options?.method ?? "GET";
      if (url.startsWith("/api/context/")) {
        if (method !== "GET") {
          const payload = options?.body ? JSON.parse(String(options.body)) : {};
          writes.push({ url, method, data: payload });
          if (fail)
            return new Response(JSON.stringify({ detail: "Could not save" }), {
              status: 409,
            });
          const id = url.split("/").at(-1)!;
          if (url.includes("/topics")) {
            if (method === "POST")
              space.topics.push({
                ...topic("new-topic", payload.name),
                ...payload,
              });
            if (method === "PUT")
              Object.assign(
                space.topics.find((t) => t.id === id)!,
                payload,
              );
            if (method === "DELETE") {
              space.topics = space.topics.filter((t) => t.id !== id);
              space.context_notes.forEach((n) => {
                n.topic_ids = n.topic_ids.filter((t) => t !== id);
              });
            }
            data = space.topics.at(-1);
          } else {
            if (method === "POST")
              space.context_notes.unshift({
                ...note("new-note", payload.body, payload.topic_ids),
                tags: payload.tags,
              });
            if (method === "PUT")
              Object.assign(
                space.context_notes.find((n) => n.id === id)!,
                payload,
                { updated_at: "2026-01-02T00:00:00Z" },
              );
            if (method === "DELETE")
              space.context_notes = space.context_notes.filter(
                (n) => n.id !== id,
              );
            data = space.context_notes[0];
          }
        } else {
          space.topics.forEach((t) => {
            t.note_count = space.context_notes.filter((n) =>
              n.topic_ids.includes(t.id),
            ).length;
          });
          data = space;
        }
      }
      if (url === "/api/projects/parent")
        data = {
          id: "parent",
          title: "Atlas",
          status: "active",
          tags: [],
          created_at: stamp,
          updated_at: stamp,
        };
      if (url === "/api/inbox/parent")
        data = {
          id: "parent",
          text: "Inbox thought",
          archived: false,
          tags: [],
          created_at: stamp,
          updated_at: stamp,
        };
      if (url === "/api/notes")
        data = [
          {
            id: "formal",
            title: "Architecture investigation",
            body: "A formal document",
            related_type: "projects",
            related_id: "parent",
            tags: [],
            created_at: stamp,
            updated_at: stamp,
          },
        ];
      if (url.startsWith("/api/search?"))
        data = [
          {
            id: "a",
            kind: "topics",
            title: "Architecture",
            matches: { name: "Architecture" },
            parent_type: "projects",
            parent_id: "parent",
            parent_title: "Atlas",
            note_count: 2,
          },
          {
            id: "shared",
            kind: "context_notes",
            title: "Atlas",
            matches: { body: "Shared observation" },
            parent_type: "projects",
            parent_id: "parent",
            parent_title: "Atlas",
            topic_names: ["Architecture", "Backlinks"],
          },
        ];
      return method === "DELETE"
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(data));
    }),
  );
});
function mount(path = "/projects/parent", app = false) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        {app ? <App /> : <DeepContext kind="projects" id="parent" />}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
test("scoped topic counts, shared membership, filtering and All never write", async () => {
  mount();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Architecture (2)" }),
  );
  expect(screen.getAllByRole("article")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Backlinks (1)" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByText("Shared observation")).toBeInTheDocument();
  expect(screen.getByRole("article")).toHaveTextContent(
    "ArchitectureBacklinks",
  );
  await user.click(screen.getByRole("button", { name: "All (3)" }));
  expect(screen.getAllByRole("article")).toHaveLength(3);
  expect(writes).toEqual([]);
});
test("create then rename a Topic and edit its description", async () => {
  mount();
  const user = userEvent.setup();
  await screen.findByText("Shared observation");
  await user.click(screen.getByRole("button", { name: "+ Topic" }));
  expect(screen.getByLabelText("Topic name")).toHaveFocus();
  await user.type(screen.getByLabelText("Topic name"), "Research");
  await user.click(screen.getByRole("button", { name: "Create Topic" }));
  await user.click(
    await screen.findByRole("button", { name: "Manage topic Research" }),
  );
  await user.clear(screen.getByLabelText("Topic name"));
  await user.type(screen.getByLabelText("Topic name"), "Evidence");
  await user.type(
    screen.getByLabelText("Description (optional)"),
    "Sources to compare",
  );
  await user.click(screen.getByRole("button", { name: "Save Topic" }));
  await user.click(await screen.findByRole("button", { name: "Evidence (0)" }));
  expect(screen.getByText("Sources to compare")).toBeInTheDocument();
});
test("deleting a Topic keeps its notes and their other memberships", async () => {
  mount();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Manage topic Architecture" }),
  );
  await user.click(screen.getByRole("button", { name: "Delete Topic" }));
  await user.click(screen.getByRole("button", { name: "Remove Topic" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Architecture (2)" }),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getAllByRole("article")).toHaveLength(3);
  expect(
    screen.getByRole("button", { name: "Backlinks (1)" }),
  ).toBeInTheDocument();
});
test("minimum inline capture needs only multiline body and keyboard save, and becomes visible from a filter", async () => {
  mount();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Architecture (2)" }),
  );
  await user.click(screen.getByRole("button", { name: "Add note…" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Observation")).toHaveFocus();
  await user.type(
    screen.getByLabelText("Observation"),
    "One line{Enter}Another line",
  );
  expect(writes).toHaveLength(0);
  await user.keyboard("{Control>}{Enter}{/Control}");
  await screen.findByText(/One line.*Another line/);
  expect(writes[0].data).toEqual({
    body: "One line\nAnother line",
    topic_ids: [],
    tags: [],
  });
  expect(screen.getByRole("button", { name: "All (4)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("multi-Topic capture with optional tags appears once under each filter", async () => {
  mount();
  const user = userEvent.setup();
  await screen.findByText("Shared observation");
  await user.click(screen.getByRole("button", { name: "Add note…" }));
  await user.type(screen.getByLabelText("Observation"), "New shared thought");
  await user.click(screen.getByRole("checkbox", { name: "Architecture" }));
  await user.click(screen.getByRole("checkbox", { name: "Backlinks" }));
  await user.click(screen.getByText("Tags (optional · across your workspace)"));
  await user.type(screen.getByLabelText("Context tags"), "research, reference");
  await user.click(screen.getByRole("button", { name: "Save note" }));
  await screen.findByText("New shared thought");
  expect(writes[0].data).toEqual({
    body: "New shared thought",
    topic_ids: ["a", "b"],
    tags: ["research", "reference"],
  });
  for (const name of ["Architecture (3)", "Backlinks (2)"]) {
    await user.click(screen.getByRole("button", { name }));
    expect(screen.getAllByText("New shared thought")).toHaveLength(1);
  }
});
test("editing changes body and memberships; confirmed deletion removes only the observation", async () => {
  mount();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", {
      name: "Edit observation Shared observation",
    }),
  );
  await user.clear(screen.getByLabelText("Observation"));
  await user.type(screen.getByLabelText("Observation"), "Revised thought");
  await user.click(screen.getByRole("checkbox", { name: "Architecture" }));
  await user.click(screen.getByRole("button", { name: "Save observation" }));
  await user.click(
    await screen.findByRole("button", {
      name: "Delete observation Revised thought",
    }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Delete observation",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Revised thought")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Backlinks (0)" }),
  ).toBeInTheDocument();
});
test("a new Topic can be created while writing without losing the inline draft", async () => {
  mount();
  const user = userEvent.setup();
  await screen.findByText("Shared observation");
  await user.click(screen.getByRole("button", { name: "Add note…" }));
  await user.type(
    screen.getByLabelText("Observation"),
    "Draft with a new context",
  );
  await user.click(screen.getByRole("button", { name: "+ Topic" }));
  await user.type(screen.getByLabelText("Topic name"), "New evidence");
  await user.click(screen.getByRole("button", { name: "Create Topic" }));
  await user.click(
    await screen.findByRole("checkbox", { name: "New evidence" }),
  );
  expect(screen.getByLabelText("Observation")).toHaveValue(
    "Draft with a new context",
  );
  await user.click(screen.getByRole("button", { name: "Save note" }));
  await screen.findByText("Draft with a new context");
  expect(writes[1].data.topic_ids).toEqual(["new-topic"]);
});

test("failed save keeps the draft and selections for retry", async () => {
  mount();
  const user = userEvent.setup();
  await screen.findByText("Shared observation");
  fail = true;
  await user.click(screen.getByRole("button", { name: "Add note…" }));
  await user.type(screen.getByLabelText("Observation"), "Keep this draft");
  await user.click(screen.getByRole("checkbox", { name: "Backlinks" }));
  await user.click(screen.getByRole("button", { name: "Save note" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
  expect(screen.getByLabelText("Observation")).toHaveValue("Keep this draft");
  expect(screen.getByRole("checkbox", { name: "Backlinks" })).toBeChecked();
});
test("formal Related Notes stay separate on the detail page; Inbox has no Deep Context", async () => {
  const view = mount("/projects/parent", true);
  await screen.findByText("Shared observation");
  expect(
    screen.getByRole("heading", { name: "Related Notes" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Architecture investigation/ }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "Deep Context" })).queryByText(
      "Architecture investigation",
    ),
  ).not.toBeInTheDocument();
  view.unmount();
  mount("/inbox/parent", true);
  await screen.findByText("Inbox thought");
  expect(
    screen.queryByRole("region", { name: "Deep Context" }),
  ).not.toBeInTheDocument();
});
test.each(["topics", "context_notes"])(
  "%s search results identify their type and navigate to selected/focused context",
  async (kind) => {
    mount("/search?q=architecture", true);
    const user = userEvent.setup();
    await screen.findByText("2 results for “architecture”");
    const links = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.startsWith("/projects/parent?"));
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent(
      "TopicArchitectureAtlas · 2 context notes",
    );
    expect(links[1]).toHaveTextContent(
      "Context NoteAtlasArchitecture · Backlinks",
    );
    await user.click(links[kind === "topics" ? 0 : 1]);
    await screen.findByText("Shared observation");
    if (kind === "topics") {
      expect(
        screen.getByRole("button", { name: "Architecture (2)" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText("Unsorted thought")).not.toBeInTheDocument();
    } else {
      expect(
        screen.getByText("Shared observation").closest("article"),
      ).toHaveFocus();
      expect(
        screen.getByText("Shared observation").closest("article"),
      ).toHaveClass("focused-context");
    }
  },
);
