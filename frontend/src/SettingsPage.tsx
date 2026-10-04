import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { json, request, useWrite, type Settings } from "./api";
import { ErrorMessage } from "./components";

export function SettingsPage() {
  const info = useQuery({
    queryKey: ["settings"],
    queryFn: () => request<Settings>("/settings"),
  });
  const [file, setFile] = useState<File | null>(null);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [exporting, setExporting] = useState(false);
  const importer = useWrite(async () => {
    if (!file) throw new Error("Choose a backup file");
    if (file.size > 25 * 1024 * 1024)
      throw new Error("Choose a backup smaller than 25 MB");
    const data: unknown = JSON.parse(await file.text());
    return request<{ imported: number }>("/import", json("POST", data));
  });
  const exportBackup = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const data = await request<unknown>("/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `command-center-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(
        error instanceof Error ? error : new Error("Export failed"),
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOURS TO KEEP</p>
          <h1>Settings & data</h1>
          <p>A private workspace. No accounts, no sync, no cloud dependency.</p>
        </div>
      </div>
      <ErrorMessage error={info.error} />
      <section className="settings-section">
        <h2>Local storage</h2>
        {info.data && (
          <>
            <p>Personal Command Center · v{info.data.version}</p>
            <code className="db-path">{info.data.database}</code>
            <p>
              {Object.values(info.data.counts).reduce((a, b) => a + b, 0)}{" "}
              records across your workspace
            </p>
          </>
        )}
      </section>
      <section className="settings-section">
        <h2>Export a backup</h2>
        <p>
          Download all records, tags, relations, timestamps, and activity as
          versioned JSON.
        </p>
        <button disabled={exporting} onClick={() => void exportBackup()}>
          {exporting ? "Exporting…" : "Export all data"}
        </button>
        <ErrorMessage error={exportError} />
      </section>
      <section className="settings-section">
        <h2>Import a backup</h2>
        <p>
          Imports add records. Existing record or activity IDs cause the entire
          import to be rejected. Matching tag names are merged. Nothing is
          overwritten.
        </p>
        <label>
          JSON backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              importer.reset();
            }}
          />
        </label>
        <button
          disabled={!file || importer.isPending}
          onClick={() => importer.mutate(undefined)}
        >
          {importer.isPending ? "Importing…" : "Validate & import"}
        </button>
        <ErrorMessage error={importer.error} />
        {importer.isSuccess && (
          <p role="status">Imported {importer.data.imported} records.</p>
        )}
      </section>
      <section className="settings-section">
        <h2>Keyboard shortcuts</h2>
        <p>
          <kbd>Ctrl / ⌘ K</kbd> Search · <kbd>Ctrl / ⌘ Shift Space</kbd> Capture
          · <kbd>Esc</kbd> Close a dialog
        </p>
      </section>
    </>
  );
}
