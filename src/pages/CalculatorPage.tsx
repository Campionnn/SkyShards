import React, { useState } from "react";
import { AlertCircle, Menu, X } from "lucide-react";
import { CalculatorForm } from "../components/CalculatorForm";
import { CalculationResults } from "../components/CalculationResults";
import { useCalculation } from "../hooks/useCalculation";
import { useCustomRates } from "../hooks/useCustomRates";
import { DataService } from "../services/dataService";
import type { CalculationFormData } from "../schemas/validation";
import type { Data } from "../types";

export const CalculatorPage: React.FC = () => {
  const { result, loading, error, calculate } = useCalculation();
  const { customRates } = useCustomRates();
  const [calculationData, setCalculationData] = useState<Data | null>(null);
  const [targetShardName, setTargetShardName] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCalculate = async (formData: CalculationFormData) => {
    try {
      // Validate that we have a valid shard name before proceeding
      if (!formData.shard || formData.shard.trim() === "") {
        console.warn("Calculation skipped: No shard selected");
        return;
      }

      // Hide sidebar on mobile after submission
      setSidebarOpen(false);

      // Get shard key from name
      const dataService = DataService.getInstance();
      const nameToKeyMap = await dataService.getShardNameToKeyMap();
      const shardKey = nameToKeyMap[formData.shard.toLowerCase()];

      if (!shardKey) {
        console.warn(`Calculation skipped: Shard "${formData.shard}" not found in data`);
        return;
      }

      setTargetShardName(formData.shard);

      // Prepare calculation parameters
      const params = {
        customRates,
        hunterFortune: formData.hunterFortune,
        excludeChameleon: formData.excludeChameleon,
        frogPet: formData.frogPet,
        newtLevel: formData.newtLevel,
        salamanderLevel: formData.salamanderLevel,
        lizardKingLevel: formData.lizardKingLevel,
        leviathanLevel: formData.leviathanLevel,
        pythonLevel: formData.pythonLevel,
        kingCobraLevel: formData.kingCobraLevel,
        seaSerpentLevel: formData.seaSerpentLevel,
        tiamatLevel: formData.tiamatLevel,
        kuudraTier: formData.kuudraTier,
        moneyPerHour: formData.moneyPerHour,
        noWoodenBait: formData.noWoodenBait,
      };

      await calculate(shardKey, formData.quantity, params);

      // Also get the data for display purposes
      const calculationService = await import("../services/calculationService");
      const service = calculationService.CalculationService.getInstance();
      const data = await service.parseData(params);
      setCalculationData(data);
    } catch (err) {
      // Only log significant errors, not validation failures
      if (err instanceof Error && !err.message.includes("not found")) {
        console.error("Calculation failed:", err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6">
        {/* Configuration Panel */}
        <div className="xl:col-span-2">
          <div className="sticky top-4">
            {/* Mobile toggle */}
            <div className="xl:hidden mb-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white flex items-center justify-center space-x-2">
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span className="text-sm font-medium">{sidebarOpen ? "Hide" : "Show"} Configuration</span>
              </button>
            </div>

            <div className={`${sidebarOpen ? "block" : "hidden xl:block"}`}>
              <CalculatorForm onSubmit={handleCalculate} />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-3 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-400">Calculation Error</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && calculationData && <CalculationResults result={result} data={calculationData} targetShardName={targetShardName} />}

          {/* Empty State */}
          {!result && !loading && !error && (
            <div className="text-center py-12 bg-slate-800/30 border border-slate-700 rounded">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center mx-auto">
                  <Menu className="w-6 h-6 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-white">Ready to Calculate</h3>
                <p className="text-slate-400 text-sm">Configure your settings and select a shard to see optimal fusion paths</p>
                <div className="xl:hidden">
                  <button onClick={() => setSidebarOpen(true)} className="px-4 py-2 bg-slate-700 text-white text-sm rounded flex items-center space-x-1 mx-auto">
                    <Menu className="w-4 h-4" />
                    <span>Open Configuration</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
