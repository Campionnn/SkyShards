import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calculator, Settings, Shuffle, Menu, X, ExternalLink } from "lucide-react";

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const KofiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 241 194" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_1_219" className="mask-type-luminance" maskUnits="userSpaceOnUse" x="-1" y="0" width="242" height="194">
      <path d="M240.469 0.958984H-0.00585938V193.918H240.469V0.958984Z" fill="white" />
    </mask>
    <g mask="url(#mask0_1_219)">
      <path
        d="M96.1344 193.911C61.1312 193.911 32.6597 178.256 15.9721 149.829C1.19788 124.912 -0.00585938 97.9229 -0.00585938 67.7662C-0.00585938 49.8876 5.37293 34.3215 15.5413 22.7466C24.8861 12.1157 38.1271 5.22907 52.8317 3.35378C70.2858 1.14271 91.9848 0.958984 114.545 0.958984C151.259 0.958984 161.63 1.4088 176.075 2.85328C195.29 4.76026 211.458 11.932 222.824 23.5955C234.368 35.4428 240.469 51.2624 240.469 69.3627V72.9994C240.469 103.885 219.821 129.733 191.046 136.759C188.898 141.827 186.237 146.871 183.089 151.837L183.006 151.964C172.869 167.632 149.042 193.918 103.401 193.918H96.1281L96.1344 193.911Z"
        className="fill-amber-300"
      />
      <path
        d="M174.568 17.9772C160.927 16.6151 151.38 16.1589 114.552 16.1589C90.908 16.1589 70.9008 16.387 54.7644 18.4334C33.3949 21.164 15.2058 37.5285 15.2058 67.7674C15.2058 98.0066 16.796 121.422 29.0741 142.107C42.9425 165.751 66.1302 178.707 96.1412 178.707H103.414C140.242 178.707 160.25 159.156 170.253 143.698C174.574 136.874 177.754 130.058 179.801 123.234C205.947 120.96 225.27 99.3624 225.27 72.9941V69.3577C225.27 40.9432 206.631 21.164 174.574 17.9772H174.568Z"
        className="fill-amber-300"
      />
      <path
        d="M15.1975 67.7674C15.1975 37.5285 33.3866 21.164 54.7559 18.4334C70.8987 16.387 90.906 16.1589 114.544 16.1589C151.372 16.1589 160.919 16.6151 174.559 17.9772C206.617 21.1576 225.255 40.937 225.255 69.3577V72.9941C225.255 99.3687 205.932 120.966 179.786 123.234C177.74 130.058 174.559 136.874 170.238 143.698C160.235 159.156 140.228 178.707 103.4 178.707H96.1264C66.1155 178.707 42.9277 165.751 29.0595 142.107C16.7814 121.422 15.1912 98.4563 15.1912 67.7674"
        fill="#202020"
      />
      <path
        d="M32.2469 67.9899C32.2469 97.3168 34.0654 116.184 43.6127 133.689C54.5225 153.924 74.3018 161.653 96.8117 161.653H103.857C133.411 161.653 147.736 147.329 155.693 134.829C159.558 128.462 162.966 121.417 164.784 112.547L166.147 106.864H174.332C192.521 106.864 208.208 92.09 208.208 73.2166V69.8082C208.208 48.6669 195.024 37.5228 172.058 34.7987C159.102 33.6646 151.372 33.2084 114.538 33.2084C89.7602 33.2084 72.0272 33.4364 58.6152 35.4828C39.7483 38.2134 32.2407 48.8951 32.2407 67.9899"
        className="fill-amber-300"
      />
      <path
        d="M166.158 83.6801C166.158 86.4107 168.204 88.4572 171.841 88.4572C183.435 88.4572 189.802 81.8619 189.802 70.9523C189.802 60.0427 183.435 53.2195 171.841 53.2195C168.204 53.2195 166.158 55.2657 166.158 57.9963V83.6866V83.6801Z"
        fill="#202020"
      />
      <path
        d="M54.5321 82.3198C54.5321 95.732 62.0332 107.326 71.5807 116.424C77.9478 122.562 87.9515 128.93 94.7685 133.022C96.8147 134.157 98.8611 134.841 101.136 134.841C103.866 134.841 106.134 134.157 107.959 133.022C114.782 128.93 124.779 122.562 130.919 116.424C140.694 107.332 148.195 95.7383 148.195 82.3198C148.195 67.7673 137.286 54.8115 121.599 54.8115C112.28 54.8115 105.912 59.5882 101.136 66.1772C96.8147 59.582 90.2259 54.8115 80.9001 54.8115C64.9855 54.8115 54.5256 67.7673 54.5256 82.3198"
        className="fill-[#403224]"
      />
    </g>
  </svg>
);

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Calculator", icon: Calculator, color: "purple" },
    { path: "/recipes", label: "Recipes", icon: Shuffle, color: "green" },
    { path: "/shards", label: "Shards", icon: Settings, color: "blue" },
  ];

  const colorClasses: Record<string, { bg: string; hoverBg: string; text: string; border: string; hoverBorder: string }> = {
    purple: {
      bg: "bg-purple-500/20",
      hoverBg: "hover:bg-purple-500/30",
      text: "text-purple-300",
      border: "border border-purple-500/20",
      hoverBorder: "hover:border-purple-500/30",
    },
    green: {
      bg: "bg-green-500/20",
      hoverBg: "hover:bg-green-500/30",
      text: "text-green-300",
      border: "border border-green-500/20",
      hoverBorder: "hover:border-green-500/30",
    },
    yellow: {
      bg: "bg-yellow-500/20",
      hoverBg: "hover:bg-yellow-500/30",
      text: "text-yellow-300",
      border: "border border-yellow-500/20",
      hoverBorder: "hover:border-yellow-500/30",
    },
    blue: {
      bg: "bg-blue-500/20",
      hoverBg: "hover:bg-blue-500/30",
      text: "text-blue-300",
      border: "border border-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
    },
  };

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
            {navItems.map(({ path, label, icon: Icon, color }) => {
              const isActive = location.pathname === path;
              const colorClass = colorClasses[color];
              const ringClass = isActive
                ? color === "blue"
                  ? "ring-1 ring-offset-0 ring-blue-300"
                  : color === "green"
                  ? "ring-1 ring-offset-0 ring-green-300"
                  : "ring-1 ring-offset-0 ring-purple-300"
                : "";
              return (
                <Link
                  key={path}
                  to={path}
                  className={`px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer ${colorClass.bg} ${colorClass.hoverBg} ${colorClass.text} ${colorClass.border} ${colorClass.hoverBorder} ${ringClass}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <a
                href="https://greenhouse.skyshards.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 hover:border-green-500/30"
            >
              <span>Greenhouse</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://github.com/Campionnn/SkyShards"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20 hover:border-gray-500/30"
            >
              <GitHubIcon className="w-3 h-3" />
              <span>Github</span>
            </a>
            <a
              href="https://ko-fi.com/skyshards"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1.5 font-medium rounded-md text-xs transition-colors duration-200 flex items-center space-x-1 cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 hover:border-amber-500/30"
              title="Buy us a coffee!"
            >
              <KofiIcon className="w-3.5 h-3.5 mask-type-luminance" />
              <span>Buy us a coffee!</span>
            </a>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              {navItems.map(({ path, label, icon: Icon, color }) => {
                const isActive = location.pathname === path;
                const colorClass = colorClasses[color];
                const ringClass = isActive
                  ? color === "blue"
                    ? "ring-1 ring-offset-0 ring-blue-300"
                    : color === "green"
                    ? "ring-1 ring-offset-0 ring-green-300"
                    : "ring-1 ring-offset-0 ring-purple-300"
                  : "";
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 font-medium rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer ${colorClass.bg} ${colorClass.hoverBg} ${colorClass.text} ${colorClass.border} ${colorClass.hoverBorder} ${ringClass}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}

              <div className="border-t border-slate-600 pt-3 my-1 space-y-1 flex flex-col gap-1">
                <a
                  href="https://github.com/Campionnn/SkyShards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 font-medium rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20 hover:border-gray-500/30"
                >
                  <GitHubIcon className="w-4 h-4" />
                  <span>Github</span>
                </a>
                <a
                  href="https://ko-fi.com/skyshards"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 font-medium rounded-md text-sm transition-colors duration-200 flex items-center space-x-2 cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/20 hover:border-amber-500/30"
                  title="Buy me a coffee"
                >
                  <KofiIcon className="w-4 h-4" />
                  <span>Buy us a coffee!</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
