import React, { useMemo } from "react";
import { X, Target, TrendingUp, Trash2, AlertTriangle } from "lucide-react";
import { useGreenhouseData } from "../../context";
import { MutationAutocomplete } from "./MutationAutocomplete";
import { getCropImagePath } from "../../types/greenhouse";
import { getRarityTextColor } from "../../utilities";
import type { MutationDefinition } from "../../types/greenhouse";

export const MutationTargets: React.FC = () => {
  const {
    mutations,
    selectedMutations,
    addMutation,
    removeMutation,
    updateMutationMode,
    updateMutationTargetCount,
    isLoading,
    getCropDef,
    getMutationDef,
  } = useGreenhouseData();

  // available mutations
  const availableMutations = mutations.filter(
    (m) => !selectedMutations.some((s) => s.id === m.id)
  );

  // Check for multiple maximize targets
  const hasMultipleMaximize = useMemo(() => {
    return selectedMutations.filter((m) => m.mode === "maximize").length > 1;
  }, [selectedMutations]);

  const handleAddMutation = (id: string, name: string) => {
    addMutation(id, name);
  };

  if (isLoading) {
  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-200">Mutation Targets</h3>
        </div>
        {selectedMutations.length > 0 && (
          <button
            onClick={() => selectedMutations.forEach((m) => removeMutation(m.id))}
            className="p-1.5 hover:bg-slate-600/50 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Clear all targets"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-200">Mutation Targets</h3>
        </div>
        {selectedMutations.length > 0 && (
          <button
            onClick={() => selectedMutations.forEach((m) => removeMutation(m.id))}
            className="p-1.5 hover:bg-slate-600/50 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Clear all targets"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Select which mutations to optimize for. Choose to maximize count or set
        a specific target.
      </p>

      {/* selected mutations */}
      <div className="space-y-2 mb-4">
        {selectedMutations.map((selected) => {
          const mutation = mutations.find((m) => m.id === selected.id);
          return (
            <div
              key={selected.id}
              className="bg-slate-700/50 border border-slate-600/30 rounded-md p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={getCropImagePath(selected.id)}
                      alt={selected.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const icon = document.createElement("div");
                          icon.className = "text-emerald-400";
                          icon.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${mutation ? getRarityTextColor(mutation.rarity) : "text-slate-200"}`}>
                    {selected.name}
                  </span>
                </div>
                <button
                  onClick={() => removeMutation(selected.id)}
                  className="p-1.5 hover:bg-slate-600/50 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {mutation && (
                <div className="text-xs text-slate-400 mb-2">
                  Requires:{" "}
                  {mutation.requirements.map((r, i) => {
                    const reqCropDef = getCropDef(r.crop);
                    const reqMutationDef = getMutationDef(r.crop);
                    const displayName = reqCropDef?.name || reqMutationDef?.name || r.crop.replace(/_/g, " ");
                    const rarityColor = reqMutationDef ? getRarityTextColor(reqMutationDef.rarity) : "text-white";
                    
                    return (
                      <span key={r.crop}>
                        {i > 0 && ", "}
                        <span className={rarityColor}>
                          {r.count}x {displayName}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => updateMutationMode(selected.id, "maximize")}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    selected.mode === "maximize"
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-600/30 text-slate-400 border border-slate-500/30 hover:bg-slate-600/50"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Maximize</span>
                </button>
                <button
                  onClick={() => updateMutationMode(selected.id, "target")}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    selected.mode === "target"
                      ? "bg-blue-500/30 text-blue-300 border border-blue-500/40"
                      : "bg-slate-600/30 text-slate-400 border border-slate-500/30 hover:bg-slate-600/50"
                  }`}
                >
                  <Target className="w-3 h-3" />
                  <span>Target</span>
                </button>
              </div>

              {selected.mode === "target" && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-slate-400">Count:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={selected.targetCount}
                    onChange={(e) =>
                      updateMutationTargetCount(
                        selected.id,
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-16 px-2 py-1 bg-slate-700/50 border border-slate-600/30 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
            </div>
          );
        })}

        {selectedMutations.length === 0 && (
          <div className="text-center py-4 text-xs text-slate-500">
            No mutations selected. Add a target to optimize for.
          </div>
        )}
      </div>

      {/* Warning for multiple maximize targets */}
      {hasMultipleMaximize && (
        <div className="flex items-start gap-2 p-2.5 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90">
            Multiple maximize targets selected. The solver will prioritize whichever mutation it can fit the most of, and will not balance between them.
          </p>
        </div>
      )}

      {/* mutation search */}
      {availableMutations.length > 0 && (
        <MutationAutocomplete
          mutations={mutations}
          excludeIds={selectedMutations.map((m) => m.id)}
          onSelect={(mutation: MutationDefinition) => handleAddMutation(mutation.id, mutation.name)}
          placeholder="Add mutation target..."
        />
      )}
    </div>
  );
};
