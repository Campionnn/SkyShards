import React, { useState, useRef } from "react";
import { Info, Check, Mail, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DiscordIcon } from "../components/ui/DiscordIcon";

const Divider = () => <hr className="my-6 border-slate-700" />;

export const AboutPage: React.FC = () => {
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const timeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopied((prev) => ({ ...prev, [tag]: true }));
    if (timeouts.current[tag]) {
      clearTimeout(timeouts.current[tag]);
    }
    timeouts.current[tag] = setTimeout(() => {
      setCopied((prev) => ({ ...prev, [tag]: false }));
      delete timeouts.current[tag];
    }, 1200);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 text-slate-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8 text-purple-400" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4 text-slate-100">About SkyShards</h1>
      <p className="mb-2 text-slate-400">
        SkyShards is a tool designed to help you calculate, plan, and optimize your shard fusions in the game. This project is open source and not affiliated with the game developers.
      </p>
      <p className="mb-2 text-slate-400">
        Hello person working at Hypixel that is verifying I own this website. My Minecraft username is Campionn and I would like an API key so I can get player shard data for people to easily import.
      </p>
      <p className="mb-2 text-slate-400">
        Also, I know you probably don't have the power to, but can we please get more official information about the greenhouse? There's a lot of things that would greatly help the community create tools if we could get more information about how the greenhouse works, like the mutation chances and base drops for the basic crops planted in the greenhouse. In regards to mutation chances, we noticed that having a alternating checkerboard layout for gloomgourds resulted in more gloomgourds per growth stage compared to a maximum layout even though the checkerboard layout only has 50 possible gloomgourds while the maximum layout has 72 possible gloomgourds, which leads us to believe that there is some sort of hidden mechanic that gives a higher mutation chance to crops that are adjacent to more crops. If you could confirm if this is the case and provide the exact mutation chances for each mutation and how they are affected by the adjacent crops/mutations, it would be a huge help to the community and allow us to create better tools for optimizing greenhouse layouts.
      </p>
      <Divider />
      <div className="mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-white mx-[3.5px]" />
        <a href="mailto:skyshardsdev@gmail.com" className="text-purple-400 underline">
          skyshardsdev@gmail.com
        </a>
      </div>
      <div className="mb-4 flex gap-2 items-center">
        <DiscordIcon className="w-7 h-7" />
        <div className="relative flex flex-col items-center min-w-[80px]">
          <button className="font-mono cursor-pointer text-fuchsia-200 bg-slate-700 rounded-sm px-1 flex items-center gap-1 hover:bg-slate-800 transition" onClick={() => handleCopy("campionn")}>
            campionn
            <Copy className="w-4 h-4 text-white" />
          </button>
          <AnimatePresence>
            {copied["campionn"] && (
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
            <Copy className="w-4 h-4 text-white" />
          </button>
          <AnimatePresence>
            {copied["xkapy"] && (
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
