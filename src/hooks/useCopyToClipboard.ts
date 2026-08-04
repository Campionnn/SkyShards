import { useCallback } from "react";
import { useToast } from "../components";
import { copyText } from "../utilities";

/**
 * Copies text and reports the outcome through a toast.
 *
 * `noun` is what the copied thing is called in the message ("recipe", "list", ...).
 */
export const useCopyToClipboard = () => {
  const { toast } = useToast();

  return useCallback(
    async (text: string, label: string, noun: string = "recipe") => {
      try {
        await copyText(text);
        toast({ title: "Copied", description: `${label} ${noun} copied to clipboard.`, variant: "success" });
      } catch (err) {
        console.error(`Failed to copy ${label} ${noun}:`, err);
        toast({ title: "Copy failed", description: "Failed to copy to clipboard.", variant: "error" });
      }
    },
    [toast]
  );
};
