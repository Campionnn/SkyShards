interface RecipeCountBadgeProps {
  count: number;
  label: string;
  variant: "green" | "fuchsia";
}

const VARIANTS = {
  green: { container: "from-green-500/15 to-emerald-500/15 border-green-500/20 text-green-400", label: "text-green-400", count: "text-emerald-400" },
  fuchsia: { container: "from-fuchsia-500/15 to-pink-500/15 border-fuchsia-500/20 text-fuchsia-400", label: "text-fuchsia-400", count: "text-pink-400" },
} as const;

export const RecipeCountBadge = ({ count, label, variant }: RecipeCountBadgeProps) => {
  const styles = VARIANTS[variant];
  return (
    <div className={`px-4 py-2 bg-gradient-to-r ${styles.container} rounded-md border`}>
      <div className="flex items-center gap-2 text-sm">
        <span className={`font-medium ${styles.label}`}>{label}</span>
        <span className="text-slate-500">•</span>
        <span className={`font-semibold ${styles.count}`}>{count}</span>
      </div>
    </div>
  );
};
