import type { LucideIcon } from "lucide-react";

/** The large purple icon tile centred above the static pages (About, Contact, Guide). */
export const PageHeaderIcon = ({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) => (
  <div className={`text-center ${className}`}>
    <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-purple-400" />
    </div>
  </div>
);
