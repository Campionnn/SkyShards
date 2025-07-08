interface SearchFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variant: "green" | "fuchsia";
}

export const SearchFilterInput = ({ value, onChange, placeholder, variant }: SearchFilterInputProps) => {
  const focusClasses = {
    green: "focus:ring-green-500/50 focus:border-green-500/50",
    fuchsia: "focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50",
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-64 pl-8 pr-3 py-2 text-sm bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${focusClasses[variant]} hover:bg-slate-700/70 transition-colors`}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
};
