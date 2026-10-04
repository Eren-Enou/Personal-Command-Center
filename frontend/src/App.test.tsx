import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

const row = {
  id: "123",
  title: "Parser project",
  tags: ["local"],
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
let requests: { url: string; options?: RequestInit }[];
beforeEach(() => {
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      requests.push({ url, options });
      let data: unknown = [];
      if (options?.method === "POST")
        data = { ...row, ...JSON.parse(String(options.body)) };
      if (url === "/api/projects/123") data = row;
      if (url.startsWith("/api/search?"))
        data = [
          {
            id: "123",
            kind: "projects",
            title: "Parser project",
            matches: { tags: "local", next_step: "Write parser" },
          },
        ];
      return new Response(JSON.stringify(data), {
        status: options?.method === "POST" ? 201 : 200,
      });
    }),
  );
});
function mount(path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("capture preserves new typing while an earlier save is pending", async () => {
  mount();
  const user = userEvent.setup();
  let complete!: (response: Response) => void;
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    if (options?.method === "POST")
      return new Promise<Response>((resolve) => {
        complete = resolve;
      });
    return new Response("[]");
  });
  const input = screen.getByLabelText(/Quick capture/);
  await user.type(input, "First thought{Enter}");
  await user.clear(input);
  await user.type(input, "Second thought");
  await act(async () => {
    complete(new Response(JSON.stringify(row), { status: 201 }));
  });
  expect(await screen.findByText("Saved to inbox")).toBeInTheDocument();
  expect(input).toHaveValue("Second thought");
});
test("quick capture saves on Enter and clears only after success", async () => {
  mount();
  const user = userEvent.setup();
  const input = screen.getByLabelText(/Quick capture/);
  await user.type(input, "Remember the moon{Enter}");
  expect(await screen.findByText("Saved to inbox")).toBeInTheDocument();
  expect(input).toHaveValue("");
  expect(
    requests.find((r) => r.options?.method === "POST")?.options?.body,
  ).toBe(JSON.stringify({ text: "Remember the moon" }));
});
test("navigation opens games and media without losing the shell", async () => {
  mount();
  const user = userEvent.setup();
  await user.click(within(screen.getByRole("navigation")).getByText("Games"));
  expect(
    screen.getByRole("heading", { name: "Games", level: 1 }),
  ).toBeInTheDocument();
  await user.click(within(screen.getByRole("navigation")).getByText("Media"));
  expect(
    screen.getByRole("heading", { name: "Media", level: 1 }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Quick capture/)).toBeInTheDocument();
});
test("creates a project with title, next step, and tags", async () => {
  mount("/projects");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "+ New project" }));
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Title"), "Parser project");
  await user.type(
    within(dialog).getByLabelText("Next step"),
    "Write tokenizer",
  );
  await user.type(within(dialog).getByLabelText(/Tags/), "local, tools");
  await user.click(
    within(dialog).getByRole("button", { name: "Create project" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Parser project", level: 1 }),
  ).toBeInTheDocument();
  const sent = requests.find(
    (r) => r.url === "/api/projects" && r.options?.method === "POST",
  );
  expect(JSON.parse(String(sent?.options?.body))).toMatchObject({
    title: "Parser project",
    next_step: "Write tokenizer",
    tags: ["local", "tools"],
  });
});
test("search renders domain labels and why the record matched", async () => {
  mount("/search");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Search everything"), "parser{Enter}");
  expect(
    await screen.findByRole("heading", { name: "Parser project" }),
  ).toBeInTheDocument();
  expect(screen.getByText("next step")).toBeInTheDocument();
  expect(screen.getByText("next step").parentElement).toHaveTextContent(
    "Write parser",
  );
});
test("shortcuts focus global capture and search", async () => {
  mount("/games");
  const user = userEvent.setup();
  await user.keyboard("{Control>}k{/Control}");
  expect(screen.getByLabelText("Search everything")).toHaveFocus();
  await user.keyboard("{Control>}{Shift>}[Space]{/Shift}{/Control}");
  expect(screen.getByLabelText(/Quick capture/)).toHaveFocus();
});
test("failed capture keeps text and shows a useful error", async () => {
  mount();
  const user = userEvent.setup();
  vi.mocked(fetch).mockImplementation(
    async () =>
      new Response(JSON.stringify({ detail: "Disk unavailable" }), {
        status: 500,
      }),
  );
  const input = screen.getByLabelText(/Quick capture/);
  await user.type(input, "Do not lose me{Enter}");
  await waitFor(() =>
    expect(
      screen
        .getAllByRole("alert")
        .some((e) => e.textContent === "Disk unavailable"),
    ).toBe(true),
  );
  expect(input).toHaveValue("Do not lose me");
});

function responses(values: Record<string, unknown>) {
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    requests.push({ url: String(url), options });
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    const data =
      values[String(url)] ?? (options?.method ? { ...row, ...body } : []);
    return new Response(JSON.stringify(data));
  });
}

test("new and edit dialogs focus title and restore opener after closing", async () => {
  mount("/projects");
  const user = userEvent.setup();
  const opener = screen.getByRole("button", { name: "+ New project" });
  await user.click(opener);
  expect(screen.getByLabelText("Title")).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(opener).toHaveFocus();
  await user.click(within(screen.getByRole("navigation")).getByText("Search"));
});

test("edit focuses title", async () => {
  mount("/projects/123");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Title")).toHaveFocus();
});

test("reverse notes and named target links recover context", async () => {
  const note = {
    ...row,
    id: "note",
    title: "Parser decisions",
    body: "Keep the original tokens",
    related_type: "projects",
    related_id: "123",
  };
  responses({
    "/api/projects/123": row,
    "/api/projects": [row],
    "/api/notes": [note],
    "/api/notes/note": note,
  });
  mount("/projects/123");
  const user = userEvent.setup();
  const link = await screen.findByRole("link", { name: /Parser decisions/ });
  expect(link).toHaveAttribute("href", "/notes/note");
  await user.click(link);
  expect(await screen.findByText("Related project")).toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: "Parser project →" }),
  ).toHaveAttribute("href", "/projects/123");
});

test("missing note target is explained without a broken link", async () => {
  responses({
    "/api/notes/note": { ...row, related_type: "projects", related_id: "gone" },
    "/api/projects": [],
  });
  mount("/notes/note");
  expect(
    await screen.findByText("Referenced record is no longer available."),
  ).toBeInTheDocument();
});

test("converted source names destination and explicit inbox modes preserve filters", async () => {
  const source = {
    ...row,
    id: "capture",
    title: undefined,
    text: "Parser thought",
    archived: true,
    converted: true,
    converted_type: "projects",
    converted_id: "123",
  };
  responses({
    "/api/inbox": [
      source,
      { ...source, id: "active", text: "Other thought", archived: false },
    ],
    "/api/inbox/capture": source,
    "/api/projects": [row],
  });
  mount("/inbox");
  const user = userEvent.setup();
  expect(
    await screen.findByRole("button", { name: "Active (1)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Archived (1)" }));
  await user.type(screen.getByLabelText("Filter inbox"), "Parser");
  expect(screen.getByText(/Filter active:/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear filter" }));
  expect(screen.getByLabelText("Filter inbox")).toHaveValue("");
  await user.click(screen.getByRole("link", { name: /Parser thought/ }));
  expect(await screen.findByText("Converted to project")).toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: "Parser project →" }),
  ).toHaveAttribute("href", "/projects/123");
});

test("capture tagging is optional and patches only the saved capture", async () => {
  mount("/inbox");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Quick capture/), "A thought{Enter}");
  await user.click(
    await screen.findByRole("button", { name: "Add tags to saved capture" }),
  );
  const tags = screen.getByLabelText("Tags");
  expect(tags).toHaveFocus();
  await user.clear(tags);
  await user.type(tags, "context, local");
  await user.click(screen.getByRole("button", { name: "Save tags" }));
  await waitFor(() =>
    expect(
      requests.some(
        (r) => r.url === "/api/inbox/123" && r.options?.method === "PATCH",
      ),
    ).toBe(true),
  );
  expect(requests.filter((r) => r.options?.method === "POST")).toHaveLength(1);
  expect(
    JSON.parse(
      String(
        requests.find((r) => r.options?.method === "PATCH")?.options?.body,
      ),
    ),
  ).toEqual({ tags: ["context", "local"] });
});

test("search safely highlights matches, filters domains, and explains source state", async () => {
  responses({
    "/api/search?q=parser": [
      {
        id: "p",
        kind: "projects",
        title: "Parser <script>",
        matches: { title: "Parser <script>" },
      },
      {
        id: "i",
        kind: "inbox",
        title: "Parser thought",
        matches: { text: "Parser thought" },
        archived: true,
        converted: true,
        converted_type: "notes",
      },
    ],
  });
  const { container } = mount("/search?q=parser");
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Parser <script>" });
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelectorAll("mark").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Inbox" }));
  expect(
    screen.queryByRole("heading", { name: "Parser <script>" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Archived")).toBeInTheDocument();
  expect(screen.getByText("Converted → note")).toBeInTheDocument();
  expect(screen.getByLabelText("Search everything")).toHaveValue("parser");
});

test("dashboard shows current media, compact navigable activity and safe deleted history", async () => {
  responses({
    "/api/media": [
      {
        ...row,
        id: "current",
        title: "Current manga",
        status: "in_progress",
        media_type: "manga",
        progress: "Chapter 28",
      },
      { ...row, id: "dropped", title: "Dropped show", status: "dropped" },
    ],
    "/api/activity": Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      kind: "projects",
      record_id: "123",
      title: i === 0 ? "Deleted project" : "Parser activity",
      action: "updated",
      created_at: row.created_at,
      record_exists: i !== 0,
    })),
  });
  mount();
  const user = userEvent.setup();
  expect(await screen.findByText("manga · Chapter 28")).toBeInTheDocument();
  expect(screen.queryByText("Dropped show")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Parser activity" })).toHaveLength(
    5,
  );
  expect(
    screen.queryByRole("link", { name: "Deleted project" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show recent 30" }));
  expect(screen.getAllByRole("link", { name: "Parser activity" })).toHaveLength(
    7,
  );
});

test.each([
  "projects",
  "games",
  "media",
  "ideas",
  "notes",
  "utilities",
  "inbox",
])("related notes support %s targets", async (kind) => {
  const target = { ...row, text: "Target capture" };
  const note = {
    ...row,
    id: "linked",
    title: "Supporting note",
    body: "Context",
    related_type: kind,
    related_id: "123",
  };
  responses({ [`/api/${kind}/123`]: target, "/api/notes": [note] });
  mount(`/${kind}/123`);
  expect(
    await screen.findByRole("link", { name: /Supporting note/ }),
  ).toHaveAttribute("href", "/notes/linked");
});
