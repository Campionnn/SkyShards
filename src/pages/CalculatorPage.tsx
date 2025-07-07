import React, { useState, useEffect } from "react";
import { AlertCircle, Menu, X } from "lucide-react";
import { CalculatorForm, CalculationResults } from "../components";
import { useCalculation, useCustomRates } from "../hooks";
import { DataService } from "../services/dataService";
import type { CalculationFormData } from "../schemas/validation";
import { useCalculatorState } from "../context/CalculatorStateContext";

const CalculatorFormWithContext: React.FC<{ onSubmit: (data: CalculationFormData, setForm: (data: CalculationFormData) => void) => void }> = ({ onSubmit }) => {
  const { setForm } = useCalculatorState();
  return <CalculatorForm onSubmit={(data) => onSubmit(data, setForm)} />;
};

const CalculatorPageContent: React.FC = () => {
  const { result, setResult, calculationData, setCalculationData, targetShardName, setTargetShardName, form } = useCalculatorState();
  const { loading, error } = useCalculation();
  const { customRates } = useCustomRates();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCalculate = async (formData: CalculationFormData, setForm: (data: CalculationFormData) => void) => {
    setForm(formData); // persist form state
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

      // Filter out undefined values from customRates
      const filteredCustomRates = Object.fromEntries(Object.entries(customRates).filter(([, v]) => v !== undefined)) as { [shardId: string]: number };

      // Prepare calculation parameters
      const params = {
        customRates: filteredCustomRates,
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
        crocodileLevel: formData.crocodileLevel,
        kuudraTier: formData.kuudraTier,
        moneyPerHour: formData.moneyPerHour,
        noWoodenBait: formData.noWoodenBait,
      };

      // Use the calculation service directly to get the result
      const calculationService = await import("../services/calculationService");
      const service = calculationService.CalculationService.getInstance();
      const calculationResult = await service.calculateOptimalPath(shardKey, formData.quantity, params);
      setResult(calculationResult);
      const data = await service.parseData(params);
      setCalculationData(data);
    } catch (err) {
      // Only log significant errors, not validation failures
      if (err instanceof Error && !err.message.includes("not found")) {
        console.error("Calculation failed:", err);
      }
    }
  };

  // Re-calculate when customRates change and form is valid
  useEffect(() => {
    if (form && form.shard && form.shard.trim() !== "") {
      // Use the same calculation logic as handleCalculate
      (async () => {
        try {
          const dataService = DataService.getInstance();
          const nameToKeyMap = await dataService.getShardNameToKeyMap();
          const shardKey = nameToKeyMap[form.shard.toLowerCase()];
          if (!shardKey) return;
          setTargetShardName(form.shard);
          const filteredCustomRates = Object.fromEntries(Object.entries(customRates).filter(([, v]) => v !== undefined)) as { [shardId: string]: number };
          const params = {
            customRates: filteredCustomRates,
            hunterFortune: form.hunterFortune,
            excludeChameleon: form.excludeChameleon,
            frogPet: form.frogPet,
            newtLevel: form.newtLevel,
            salamanderLevel: form.salamanderLevel,
            lizardKingLevel: form.lizardKingLevel,
            leviathanLevel: form.leviathanLevel,
            pythonLevel: form.pythonLevel,
            kingCobraLevel: form.kingCobraLevel,
            seaSerpentLevel: form.seaSerpentLevel,
            tiamatLevel: form.tiamatLevel,
            crocodileLevel: form.crocodileLevel,
            kuudraTier: form.kuudraTier,
            moneyPerHour: form.moneyPerHour,
            noWoodenBait: form.noWoodenBait,
          };
          const calculationService = await import("../services/calculationService");
          const service = calculationService.CalculationService.getInstance();
          const calculationResult = await service.calculateOptimalPath(shardKey, form.quantity, params);
          setResult(calculationResult);
          const data = await service.parseData(params);
          setCalculationData(data);
        } catch (err) {
          // Only log significant errors, not validation failures
          if (err instanceof Error && !err.message.includes("not found")) {
            console.error("Calculation failed (customRates effect):", err);
          }
        }
      })();
    }
  }, [customRates, form, setResult, setCalculationData, setTargetShardName]);

  return (
    <div className="min-h-screen space-y-3 py-4">
      {/* Header */}

      <div className="grid grid-cols-1 xl:grid-cols-7 gap-1 lg:gap-4">
        {/* Configuration Panel */}
        <div className="xl:col-span-2">
          {/* Mobile toggle */}
          <div className="xl:hidden mb-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="
                w-full px-3 py-2.5 
                bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/30
                rounded-md text-white hover:bg-purple-500/20 
                flex items-center justify-center space-x-2 
                transition-colors duration-200 font-medium text-sm cursor-pointer
              "
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{sidebarOpen ? "Hide" : "Show"} Configuration</span>
            </button>
          </div>

          <div className={`${sidebarOpen ? "block" : "hidden xl:block"}`}>
            <CalculatorFormWithContext onSubmit={handleCalculate} />
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-5 space-y-3">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex items-start space-x-2">
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
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-md">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/20 rounded-md flex items-center justify-center mx-auto">
                  <Menu className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Ready to Calculate</h3>
                <p className="text-slate-400 text-sm mt-1">Configure your settings and select a shard to see optimal fusion paths</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalculatorPage: React.FC = () => <CalculatorPageContent />;
