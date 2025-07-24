import React, { useState } from "react";
import { CostCalculatorForm, type CostCalculatorFormData } from "../components/forms/CostCalculatorForm";
import { CalculationResults } from "../components/results/CalculationResults";
import type { CalculationResult, Data } from "../types/types";
import { DataService } from "../services";

const CostCalculatorPage: React.FC = () => {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetShardName, setTargetShardName] = useState("");
  const [currentShardKey, setCurrentShardKey] = useState<string>("");
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);
  const [currentParams, setCurrentParams] = useState<any>(null);

  const handleSubmit = async (form: CostCalculatorFormData) => {
    setLoading(true);
    setError(null);
    try {
      const dataService = DataService.getInstance();
      const nameToKeyMap = await dataService.getShardNameToKeyMap();
      const shardKey = nameToKeyMap[form.shard.toLowerCase()];
      if (!shardKey) {
        setError("Invalid shard name");
        setLoading(false);
        return;
      }
      setTargetShardName(form.shard);
      setCurrentShardKey(shardKey);
      setCurrentQuantity(form.quantity);
      const params = {
        crocodileLevel: form.crocodileLevel,
        seaSerpentLevel: form.seaSerpentLevel,
        tiamatLevel: form.tiamatLevel,
      };
      setCurrentParams(params);
      const { CalculationService } = await import("../services/bzCalculationService");
      const service = CalculationService.getInstance();
      const calculationResult = await service.calculateOptimalPath(shardKey, form.quantity, params);
      setResult(calculationResult);
      const parsedData = await service.parseData(params);
      setData(parsedData);
    } catch (e) {
      setError("Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calculator-page max-w-5xl mx-auto px-2 py-6">
      <h1 className="text-2xl font-bold mb-2">Cost Optimizer</h1>
      <p className="mb-4 text-slate-300">Calculate the minimum Bazaar cost to obtain a target shard.</p>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
        <CostCalculatorForm onSubmit={handleSubmit} />
      </div>
      {loading && <div>Calculating...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {result && data && (
        <CalculationResults
          result={result}
          data={data}
          targetShardName={targetShardName}
          targetShard={currentShardKey}
          requiredQuantity={currentQuantity}
          params={currentParams}
          // No alternatives/overrides for cost page
          onResultUpdate={() => {}}
          recipeOverrides={[]}
          onRecipeOverridesUpdate={() => {}}
          onResetRecipeOverrides={() => {}}
        />
      )}
    </div>
  );
};

export default CostCalculatorPage;
