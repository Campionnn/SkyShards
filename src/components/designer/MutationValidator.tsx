import React, { useMemo } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useDesigner, useGreenhouseData } from "../../context";
import { getRarityTextColor } from "../../utilities";
import { getCropImagePath } from "../../types/greenhouse";

interface MutationValidatorProps {
  className?: string;
}

export const MutationValidator: React.FC<MutationValidatorProps> = ({ className = "" }) => {
  const { inputPlacements, targetPlacements, getPossibleMutations } = useDesigner();
  const { mutations } = useGreenhouseData();
  
  // Get possible mutations based on current input placements
  const possibleMutations = useMemo(() => {
    if (inputPlacements.length === 0) return [];
    return getPossibleMutations(mutations);
  }, [inputPlacements, mutations, getPossibleMutations]);
  
  // Check which target mutations are satisfied
  const targetValidation = useMemo(() => {
    return targetPlacements.map(target => {
      const possible = possibleMutations.find(p => p.mutation.id === target.cropId);
      const isValid = possible?.positions.some(
        pos => pos[0] === target.position[0] && pos[1] === target.position[1]
      );
      return {
        target,
        isValid: !!isValid,
        mutation: possible?.mutation,
      };
    });
  }, [targetPlacements, possibleMutations]);
  
  const validCount = targetValidation.filter(t => t.isValid).length;
  const invalidCount = targetValidation.filter(t => !t.isValid).length;
  
  // Show message if no targets placed
  if (targetPlacements.length === 0) {
    return (
      <div className={`text-center text-slate-500 py-4 ${className}`}>
        <p className="text-sm">Place target mutations to validate them</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className={`p-3 rounded-lg border ${
        invalidCount > 0 
          ? "bg-red-500/10 border-red-500/30" 
          : "bg-green-500/10 border-green-500/30"
      }`}>
        <div className="flex items-center gap-2">
          {invalidCount > 0 ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          <span className={`text-sm font-medium ${
            invalidCount > 0 ? "text-red-300" : "text-green-300"
          }`}>
            {validCount}/{targetPlacements.length} targets valid
          </span>
        </div>
        
        {invalidCount > 0 && (
          <p className="text-xs text-red-400/80 mt-1 ml-7">
            Some targets don't have required adjacent crops
          </p>
        )}
      </div>
      
      {/* Target Validation List */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Target Mutations
        </h4>
        {targetValidation.map(({ target, isValid, mutation }) => (
          <div
            key={target.id}
            className={`flex items-center gap-2 p-2 rounded-lg border ${
              isValid
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <img
              src={getCropImagePath(target.cropId)}
              alt={target.cropName}
              className="w-6 h-6 object-contain"
            />
            <span className={`text-sm flex-1 ${
              mutation ? getRarityTextColor(mutation.rarity) : "text-white"
            }`}>
              {target.cropName}
            </span>
            <span className="text-xs text-slate-400">
              [{target.position[0]}, {target.position[1]}]
            </span>
            {isValid ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
