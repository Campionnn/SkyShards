import React, { useState, useEffect, useRef } from "react";
import { X, Save } from "lucide-react";
import { useDesigner, useGreenhouseData } from "../../context";
import type { DesignerPlacement } from "../../context/DesignerContext";

interface SaveLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const SaveLayoutModal: React.FC<SaveLayoutModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { inputPlacements, targetPlacements } = useDesigner();
  const { getMutationDef } = useGreenhouseData();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setError("");
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a layout name");
      return;
    }
    
    if (trimmedName.length > 50) {
      setError("Layout name must be 50 characters or less");
      return;
    }
    
    onSave(trimmedName);
  };

  // Get unique target mutations for summary
  const getTargetMutationsSummary = () => {
    const mutationMap = new Map<string, DesignerPlacement>();
    
    targetPlacements.forEach(placement => {
      if (!mutationMap.has(placement.cropId)) {
        mutationMap.set(placement.cropId, placement);
      }
    });
    
    return Array.from(mutationMap.values());
  };

  const targetMutations = getTargetMutationsSummary();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-semibold text-slate-100">Save Layout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Layout Name Input */}
          <div className="mb-6">
            <label htmlFor="layout-name" className="block text-sm font-medium text-slate-300 mb-2">
              Layout Name
            </label>
            <input
              ref={inputRef}
              id="layout-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Layout Name"
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              maxLength={50}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Layout Summary */}
          <div className="mb-6 p-4 bg-slate-800/40 border border-slate-600/30 rounded-lg">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Layout Summary</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                <span>
                  <span className="font-medium text-purple-400">{targetPlacements.length}</span>
                  {' '}target {targetPlacements.length === 1 ? 'mutation' : 'mutations'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-slate-400">•</span>
                <span>
                  <span className="font-medium text-emerald-400">{inputPlacements.length}</span>
                  {' '}input {inputPlacements.length === 1 ? 'crop' : 'crops'}
                </span>
              </div>

              {targetMutations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600/30">
                  <div className="text-xs text-slate-400 mb-2">Target Mutations:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {targetMutations.map(mutation => {
                      const mutationDef = getMutationDef(mutation.cropId);
                      return (
                        <div key={mutation.cropId} className="text-xs text-slate-300 pl-4">
                          - {mutation.cropName}
                          {mutationDef && (
                            <span className="text-slate-500 ml-1">
                              ({targetPlacements.filter(p => p.cropId === mutation.cropId).length})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700/60 border border-slate-600/50 rounded-lg text-sm text-slate-300 hover:bg-slate-600/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-500/80 rounded-lg text-sm text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
