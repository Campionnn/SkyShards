import React from "react";
import { ShardAutocomplete } from "./inputs";
import { LevelDropdown } from "../calculator";

interface CostCalculatorFormProps {
  onSubmit: (data: CostCalculatorFormData) => void;
}

export interface CostCalculatorFormData {
  shard: string;
  quantity: number;
  crocodileLevel: number;
  seaSerpentLevel: number;
  tiamatLevel: number;
}

export const CostCalculatorForm: React.FC<CostCalculatorFormProps> = ({ onSubmit }) => {
  const [form, setForm] = React.useState<CostCalculatorFormData>({
    shard: "",
    quantity: 1,
    crocodileLevel: 0,
    seaSerpentLevel: 0,
    tiamatLevel: 0,
  });

  React.useEffect(() => {
    if (form.shard && form.quantity > 0) {
      onSubmit(form);
    }
  }, [form]);

  return (
    <form className="cost-calculator-form">
      <div>
        <label>Shard Name</label>
        <ShardAutocomplete value={form.shard} onChange={(v) => setForm({ ...form, shard: v })} />
      </div>
      <div>
        <label>Quantity</label>
        <input
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
      </div>
      <div>
        <label>Crocodile Level</label>
        <LevelDropdown value={form.crocodileLevel} onChange={(v) => setForm({ ...form, crocodileLevel: v })} max={10} />
      </div>
      <div>
        <label>Sea Serpent Level</label>
        <LevelDropdown value={form.seaSerpentLevel} onChange={(v) => setForm({ ...form, seaSerpentLevel: v })} max={10} />
      </div>
      <div>
        <label>Tiamat Level</label>
        <LevelDropdown value={form.tiamatLevel} onChange={(v) => setForm({ ...form, tiamatLevel: v })} max={10} />
      </div>
    </form>
  );
};

