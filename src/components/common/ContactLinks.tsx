import { Fragment, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Mail } from "lucide-react";
import { DiscordIcon } from "../ui/BrandIcons";
import { copyText } from "../../utilities";

const DISCORD_TAGS = ["campionn", "xkapy"];

/** A Discord username that copies itself on click and briefly shows "Copied!". */
const CopyableTag = ({ tag }: { tag: string }) => {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleCopy = () => {
    void copyText(tag).catch((err) => console.error("Failed to copy:", err));
    setCopied(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative flex flex-col items-center min-w-[80px]">
      <button
        className="font-mono cursor-pointer text-fuchsia-200 bg-slate-700 rounded-sm px-1 flex items-center gap-1 hover:bg-slate-800 transition"
        onClick={handleCopy}
      >
        {tag}
        <Copy className="w-4 h-4 text-white" />
      </button>
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-green-500 text-xs flex items-center gap-1 pointer-events-none"
          >
            <Check className="w-3 h-3" /> Copied!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Email and Discord contacts, shared by the About and Contact pages. */
export const ContactLinks = () => (
  <>
    <div className="mb-4 flex items-center gap-2">
      <Mail className="w-5 h-5 text-white mx-[3.5px]" />
      <a href="mailto:skyshardsdev@gmail.com" className="text-purple-400 underline">
        skyshardsdev@gmail.com
      </a>
    </div>
    <div className="mb-4 flex gap-2 items-center">
      <DiscordIcon className="w-7 h-7" />
      {DISCORD_TAGS.map((tag, i) => (
        <Fragment key={tag}>
          {i > 0 && <span className="font-semibold text-slate-300">or</span>}
          <CopyableTag tag={tag} />
        </Fragment>
      ))}
    </div>
  </>
);
