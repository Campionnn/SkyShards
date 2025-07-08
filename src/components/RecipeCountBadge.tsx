interface RecipeCountBadgeProps {
  count: number;
  label: string;
  variant: "green" | "fuchsia";
}

export const RecipeCountBadge = ({ count, label, variant }: RecipeCountBadgeProps) => {
  const variantClasses = {
    green: "from-green-500/15 to-emerald-500/15 border-green-500/20 text-green-400",
    fuchsia: "from-fuchsia-500/15 to-pink-500/15 border-fuchsia-500/20 text-fuchsia-400",
  };

  const countClasses = {
    green: "text-emerald-400",
    fuchsia: "text-pink-400",
  };

  return (
    <div className={`px-4 py-2 bg-gradient-to-r ${variantClasses[variant]} rounded-md border`}>
      <div className="flex items-center gap-2 text-sm">
        <span className={`font-medium ${variantClasses[variant].split(" ")[3]}`}>{label}</span>
        <span className="text-slate-500">•</span>
        <span className={`font-semibold ${countClasses[variant]}`}>{count}</span>
      </div>
    </div>
  );
};
