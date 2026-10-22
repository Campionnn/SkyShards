import { Info } from "lucide-react";
import { ContactLinks, PageHeaderIcon } from "../components";

export const AboutPage = () => (
  <div className="max-w-xl mx-auto py-10 px-4 text-slate-200">
    <PageHeaderIcon icon={Info} className="mb-6" />
    <h1 className="text-2xl font-bold mb-4 text-slate-100">About SkyShards</h1>
    <p className="mb-2 text-slate-400">
      SkyShards is a tool designed to help you calculate, plan, and optimize your shard fusions in the game. This project is open source and not affiliated with
      the game developers.
    </p>
    <hr className="my-6 border-slate-700" />
    <ContactLinks />
  </div>
);
