/**
 * Writes text to the clipboard.
 *
 * `navigator.clipboard` is undefined on non-secure origins (plain http, some in-app
 * webviews), so fall back to a hidden textarea there rather than throwing a
 * TypeError on property access.
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  // Off-screen so selecting it doesn't scroll the page.
  textarea.style.cssText = "position:absolute;left:-9999px;top:0;opacity:0;";
  document.body.appendChild(textarea);

  try {
    textarea.select();
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy was rejected by the browser");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
