import React, { useState } from "react";
import { motion } from "framer-motion";
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
    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 h-full">
      {/* Mobile Configuration Toggle */}
      <div className="xl:hidden">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="
            mb-4 px-4 py-2 bg-white/5 backdrop-blur-xl 
            border border-white/10 rounded-xl text-white
            hover:bg-white/10 transition-all duration-200
            flex items-center space-x-2
          "
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{sidebarOpen ? "Hide" : "Show"} Configuration</span>
        </motion.button>
      </div>

      {/* Sidebar - Configuration */}
      <div className={`xl:w-80 2xl:w-96 xl:flex-shrink-0 ${sidebarOpen ? "block" : "hidden xl:block"}`}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <CalculatorForm onSubmit={handleCalculate} />
        </motion.div>
      </div>

      {/* Main Content - Results */}
      <div className="flex-1 min-w-0">
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400">Calculation Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {result && calculationData && <CalculationResults result={result} data={calculationData} targetShardName={targetShardName} />}

        {!result && !loading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-3">Ready to Calculate</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Configure your settings <span className="xl:hidden">above</span>
              <span className="hidden xl:inline">on the left</span> and select a shard to see optimal fusion paths and material costs
            </p>
            <div className="xl:hidden mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSidebarOpen(true)}
                className="
                  px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 
                  text-white font-medium rounded-xl 
                  hover:from-purple-600 hover:to-blue-700
                  transition-all duration-200
                  flex items-center space-x-2 mx-auto
                "
              >
                <Menu className="w-4 h-4" />
                <span>Open Configuration</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
