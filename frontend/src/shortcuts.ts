import { useEffect } from "react";

export function useShortcuts(
  focusSearch: () => void,
  focusCapture: () => void,
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.code === "Space"
      ) {
        event.preventDefault();
        focusCapture();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusSearch, focusCapture]);
}
