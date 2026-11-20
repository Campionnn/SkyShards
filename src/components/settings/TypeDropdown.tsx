import { Layers } from "lucide-react";
import { FilterDropdown, type FilterOption } from "../common/FilterDropdown";

const TYPES: FilterOption[] = [
  { value: "all", label: "All Types", color: "text-emerald-400" },
  { value: "direct", label: "Direct", color: "text-green-400" },
  { value: "fuse", label: "Fuse", color: "text-fuchsia-400" },
];

export const TypeDropdown = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <FilterDropdown value={value} onChange={onChange} options={TYPES} icon={Layers} accent="emerald" />
);
