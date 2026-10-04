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
  expect(screen.getByText("Write parser")).toBeInTheDocument();
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
