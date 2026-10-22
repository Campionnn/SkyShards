import { Filter } from "lucide-react";
import { FilterDropdown, type FilterOption } from "../common/FilterDropdown";

const RARITIES: FilterOption[] = [
  { value: "all", label: "All Rarities", color: "text-violet-400" },
  { value: "common", label: "Common", color: "text-white" },
  { value: "uncommon", label: "Uncommon", color: "text-green-400" },
  { value: "rare", label: "Rare", color: "text-blue-400" },
  { value: "epic", label: "Epic", color: "text-purple-400" },
  { value: "legendary", label: "Legendary", color: "text-yellow-400" },
];

export const RarityDropdown = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <FilterDropdown value={value} onChange={onChange} options={RARITIES} icon={Filter} accent="purple" />
);
