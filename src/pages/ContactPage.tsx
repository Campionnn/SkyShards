import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Copy, Check } from "lucide-react";

const Divider = () => <hr className="my-6 border-slate-700" />;

export const ContactPage: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 text-slate-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-purple-400" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4 text-slate-100">Contact Us</h1>
      <p className="mb-2 text-slate-400">Have questions, feedback, or suggestions?</p>
      <Divider />
      <div className="mb-4">
        <span className="font-semibold text-slate-300">Email:</span>
        <a href="mailto:skyshards.contact@gmail.com" className="text-purple-400 underline ml-2">
          skyshards.contact@gmail.com
        </a>
      </div>
      <div className="mb-4 flex gap-2 items-center">
        <span className="font-semibold text-slate-300">Discord:</span>
        <div className="relative flex flex-col items-center min-w-[80px]">
          <button className="font-mono cursor-pointer text-fuchsia-200 bg-slate-700 rounded-sm px-1 flex items-center gap-1 hover:bg-slate-800 transition" onClick={() => handleCopy("campionn")}>
            campionn
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <AnimatePresence>
            {copied === "campionn" && (
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
        <span className="font-semibold text-slate-300">or</span>
        <div className="relative flex flex-col items-center min-w-[80px]">
          <button className="font-mono cursor-pointer text-fuchsia-200 bg-slate-700 rounded-sm px-1 flex items-center gap-1 hover:bg-slate-800 transition" onClick={() => handleCopy("xkapy")}>
            xkapy
            <Copy className="w-4 h-4 text-slate-400" />
          </button>
          <AnimatePresence>
            {copied === "xkapy" && (
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
      </div>
    </div>
  );
};
