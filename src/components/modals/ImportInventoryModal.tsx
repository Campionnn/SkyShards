import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, FileJson, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import type { ShardWithKey } from "../../types/types";
import { parseInventoryJson, type ParsedInventoryResult } from "../../utilities";

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Array<{ shard: ShardWithKey; quantity: number }>) => void;
  allShards: ShardWithKey[];
}

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({
  isOpen,
  onClose,
  onImport,
  allShards,
}) => {
  const [jsonInput, setJsonInput] = useState("");
  const [parseResult, setParseResult] = useState<ParsedInventoryResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setJsonInput("");
      setParseResult(null);
    }
  }, [isOpen]);

  // Parse JSON whenever input changes
  useEffect(() => {
    if (!jsonInput.trim()) {
      setParseResult(null);
      return;
    }

    const result = parseInventoryJson(jsonInput, allShards);
    setParseResult(result);
  }, [jsonInput, allShards]);

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
      };
      reader.onerror = () => {
        setParseResult({
          success: false,
          shardQuantities: [],
          selectedShardKeys: [],
          errors: ["Failed to read file."],
          unknownKeys: [],
          totalShards: 0,
          uniqueTypes: 0,
        });
      };
      reader.readAsText(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/json") {
        handleFileUpload(file);
      } else if (file) {
        setParseResult({
          success: false,
          shardQuantities: [],
          selectedShardKeys: [],
          errors: ["Please upload a JSON file."],
          unknownKeys: [],
          totalShards: 0,
          uniqueTypes: 0,
        });
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleImport = useCallback(() => {
    if (parseResult?.success) {
      onImport(parseResult.shardQuantities);
    }
  }, [parseResult, onImport]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Import Inventory</h2>
              <p className="text-sm text-slate-400">
                Paste your exported shard inventory JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div className="text-sm text-slate-300 bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
            <p className="font-medium text-slate-200 mb-1">Expected format:</p>
            <code className="text-xs text-green-400 block bg-slate-900/50 p-2 rounded">
              {`{ "hunting_box": { "C17": 150, ... }, "attribute_menu": { ... } }`}
            </code>
          </div>

          {/* Textarea / Drop Zone */}
          <div
            className={`relative transition-colors ${
              isDragging
                ? "border-green-500 bg-green-500/10"
                : "border-slate-600/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='Paste your inventory JSON here...

Example:
{
  "hunting_box": { "C17": 150, "R4": 5 },
  "attribute_menu": { "C18": 7, "U24": 31 }
}'
              className="w-full h-48 px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none"
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 border-2 border-dashed border-green-500 rounded-lg pointer-events-none">
                <div className="text-green-400 font-medium">Drop JSON file here</div>
              </div>
            )}
          </div>

          {/* File Upload Button */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700"></div>
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-700"></div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 rounded-lg text-slate-300 hover:text-white font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileJson className="w-5 h-5" />
            Upload JSON File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Parse Result / Validation Status */}
          {parseResult && (
            <div
              className={`rounded-lg p-4 border ${
                parseResult.success
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              {parseResult.success ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-400">
                      Found {parseResult.uniqueTypes} shard type
                      {parseResult.uniqueTypes !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-green-300/80 mt-1">
                      Total: {parseResult.totalShards.toLocaleString()} shards
                    </p>
                    {parseResult.unknownKeys.length > 0 && (
                      <div className="mt-2 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-400">
                          {parseResult.unknownKeys.length} unknown key
                          {parseResult.unknownKeys.length !== 1 ? "s" : ""} skipped:{" "}
                          {parseResult.unknownKeys.slice(0, 5).join(", ")}
                          {parseResult.unknownKeys.length > 5 && "..."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Invalid Data</p>
                    {parseResult.errors.map((error, i) => (
                      <p key={i} className="text-sm text-red-300/80 mt-1">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parseResult?.success}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors cursor-pointer"
          >
            Import {parseResult?.success ? `(${parseResult.uniqueTypes})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
