import { useState, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings, Shuffle, Share2, Menu, X, ExternalLink } from "lucide-react";
import { GitHubIcon, KofiIcon } from "../ui/BrandIcons";

type NavColor = "purple" | "green" | "blue" | "yellow" | "gray" | "amber";

// Full class strings so Tailwind can find them; `ring` marks the active page.
const COLOR_CLASSES: Record<NavColor, { base: string; ring: string }> = {
  purple: { base: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 hover:border-purple-500/30", ring: "ring-purple-300" },
  green: { base: "bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30", ring: "ring-green-300" },
  blue: { base: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/20 hover:border-blue-500/30", ring: "ring-blue-300" },
  yellow: { base: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/20 hover:border-yellow-500/30", ring: "ring-yellow-300" },
  gray: { base: "bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20 hover:border-gray-500/30", ring: "ring-gray-300" },
  amber: { base: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 hover:border-amber-500/30", ring: "ring-amber-300" },
};

const NAV_ITEMS: { path: string; label: string; icon: ComponentType<{ className?: string }>; color: NavColor }[] = [
  { path: "/", label: "Calculator", icon: Calculator, color: "purple" },
  { path: "/recipes", label: "Recipes", icon: Shuffle, color: "green" },
  { path: "/shards", label: "Shards", icon: Settings, color: "blue" },
  { path: "/fusion-lines", label: "Fusion Lines", icon: Share2, color: "yellow" },
];

const EXTERNAL_LINKS: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: NavColor;
  title?: string;
  desktopIconClass?: string;
}[] = [
  { href: "https://greenhouse.skyshards.com", label: "Greenhouse", icon: ExternalLink, color: "green" },
  { href: "https://github.com/Campionnn/SkyShards", label: "Github", icon: GitHubIcon, color: "gray" },
  {
    href: "https://ko-fi.com/skyshards",
    label: "Buy us a coffee!",
    icon: KofiIcon,
    color: "amber",
    title: "Buy us a coffee!",
    desktopIconClass: "w-3.5 h-3.5",
  },
];

const ITEM_BASE = "font-medium rounded-md transition-colors duration-200 flex items-center cursor-pointer";
const DESKTOP_ITEM = `${ITEM_BASE} px-2 py-1.5 text-xs space-x-1`;
const MOBILE_ITEM = `${ITEM_BASE} px-3 py-2 text-sm space-x-2`;

export const Navigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = (itemClass: string, iconClass: string, onClick?: () => void) =>
    NAV_ITEMS.map(({ path, label, icon: Icon, color }) => {
      const { base, ring } = COLOR_CLASSES[color];
      const ringClass = location.pathname === path ? `ring-1 ring-offset-0 ${ring}` : "";
      return (
        <Link key={path} to={path} onClick={onClick} className={`${itemClass} ${base} ${ringClass}`}>
          <Icon className={iconClass} />
          <span>{label}</span>
        </Link>
      );
    });

  const externalLinks = (itemClass: string, iconClass: string, mobile: boolean) =>
    EXTERNAL_LINKS.map(({ href, label, icon: Icon, color, title, desktopIconClass }) => (
      <a key={href} href={href} target="_blank" rel="noopener noreferrer" title={title} className={`${itemClass} ${COLOR_CLASSES[color].base}`}>
        <Icon className={(!mobile && desktopIconClass) || iconClass} />
        <span>{label}</span>
      </a>
    ));

  return (
    <nav className="border-b border-slate-700 bg-slate-900">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center group">
            <div
              className="text-2xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent tracking-wide group-hover:from-blue-300 group-hover:via-purple-300 group-hover:to-emerald-300 transition-all duration-300 drop-shadow-sm"
              style={{ fontFamily: "Orbitron, monospace" }}
            >
              SkyShards
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            {navLinks(DESKTOP_ITEM, "w-3 h-3")}
            {externalLinks(DESKTOP_ITEM, "w-3 h-3", false)}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="p-2 rounded-md text-slate-300 cursor-pointer hover:text-white hover:bg-slate-700 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 pt-3 py-2">
            <div className="flex flex-col space-y-1 gap-1">
              {navLinks(MOBILE_ITEM, "w-4 h-4", () => setIsMobileMenuOpen(false))}

              <div className="border-t border-slate-600 pt-3 my-1 space-y-1 flex flex-col gap-1">{externalLinks(MOBILE_ITEM, "w-4 h-4", true)}</div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
