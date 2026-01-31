import React, { useMemo } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useDesigner, useGreenhouseData } from "../../context";
import { getCropImagePath } from "../../types/greenhouse";
import type { MutationValidationInfo, DesignerPlacement } from "../../context/DesignerContext";

interface HoveredValidation extends MutationValidationInfo {
  target: DesignerPlacement;
}

interface MutationValidatorProps {
  className?: string;
}

export const MutationValidator: React.FC<MutationValidatorProps> = ({ className = "" }) => {
  const { inputPlacements, targetPlacements, getPossibleMutations, hoveredTargetId, getTargetValidation } = useDesigner();
  const { mutations, getCropDef } = useGreenhouseData();
  
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
  
  // Get the hovered target's validation info
  const hoveredValidation: HoveredValidation | null = useMemo(() => {
    if (!hoveredTargetId) return null;
    const target = targetPlacements.find(t => t.id === hoveredTargetId);
    if (!target) return null;
    
    const validation = getTargetValidation(hoveredTargetId, mutations);
    
    return {
      target,
      ...validation,
    };
  }, [hoveredTargetId, targetPlacements, getTargetValidation, mutations]);
  
  // Show message if no targets placed
  if (targetPlacements.length === 0) {
    return (
      <div className={`text-center text-slate-500 py-4 ${className}`}>
        <p className="text-sm">Place target mutations to validate them</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
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
        
        {invalidCount > 0 && !hoveredValidation && (
          <p className="text-xs text-red-400/80 mt-1 ml-7">
            Hover over mutations on the grid to see requirements
          </p>
        )}
      </div>
      
      {/* Hovered target's requirements */}
      {hoveredValidation && (
        <div className={`p-3 rounded-lg border ${
          hoveredValidation.isValid 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-slate-800/50 border-slate-600/30"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <img
              src={getCropImagePath(hoveredValidation.target.cropId)}
              alt={hoveredValidation.target.cropName}
              className="w-5 h-5 object-contain"
            />
            <span className={`text-sm font-medium ${
              hoveredValidation.isValid ? "text-green-300" : "text-slate-200"
            }`}>
              {hoveredValidation.target.cropName}
            </span>
          </div>
          
          {/* Missing requirements */}
          {hoveredValidation.missingRequirements.length > 0 && (
            <>
              <p className="text-xs font-medium text-red-400 ml-7 mb-1">Missing</p>
              <div className="space-y-1 ml-7">
                {hoveredValidation.missingRequirements.map((req, i) => {
                  const cropDef = getCropDef(req.crop);
                  const cropName = cropDef?.name || req.crop;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <img
                        src={getCropImagePath(req.crop)}
                        alt={cropName}
                        className="w-4 h-4 object-contain"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="text-slate-300">{cropName}:</span>
                      <span className="text-red-400">{req.have}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-300">{req.needed}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* Satisfied requirements */}
          {hoveredValidation.satisfiedRequirements.length > 0 && (
            <>
              <p className="text-xs font-medium text-green-400 ml-7 mt-2 mb-1">Satisfied</p>
              <div className="space-y-1 ml-7">
                {hoveredValidation.satisfiedRequirements.map((req, i) => {
                  const cropDef = getCropDef(req.crop);
                  const cropName = cropDef?.name || req.crop;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <img
                        src={getCropImagePath(req.crop)}
                        alt={cropName}
                        className="w-4 h-4 object-contain"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="text-slate-300">{cropName}:</span>
                      <span className="text-green-400">{req.have}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-300">{req.needed}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
