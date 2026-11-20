import { useMemo, useState } from "react";
import { ShardAutocomplete, RecipeCountBadge, SearchFilterInput, ShardDisplay, ShardPickerDropdown } from "../components";
import { getRarityColor, shardIconUrl } from "../utilities";
import { useFusionData, useRecipeState } from "../hooks";
import { processOutputRecipes, categorizeAndGroupRecipes, filterCategorizedRecipes, type PairRecipe, type GroupedRecipe } from "../utilities";
import type { FusionJson, Shard } from "../types/types";

type RecipeMode = "input" | "output";
type FusionType = GroupedRecipe["fusionType"];

const EMPTY_CATEGORIES = { special: [], id: [], chameleon: [] };

const CATEGORIES: { type: FusionType; heading: string; sub: string; colorClass: string }[] = [
  { type: "special", heading: "Special Fusions", sub: "Produces 2 shards", colorClass: "text-yellow-400" },
  { type: "id", heading: "ID Fusions", sub: "Produces 1 shard", colorClass: "text-blue-400" },
  { type: "chameleon", heading: "Chameleon Fusions", sub: "Produces 1 shard", colorClass: "text-green-400" },
];

/** Every two-input recipe that uses `shard` as either input. */
const getInputRecipes = (shard: Shard, fusionData: FusionJson): PairRecipe[] => {
  const recipes: PairRecipe[] = [];
  for (const [output, recipeData] of Object.entries(fusionData.recipes)) {
    for (const [quantityStr, recipeList] of Object.entries(recipeData)) {
      const quantity = parseInt(quantityStr, 10);
      for (const recipe of recipeList) {
        if (recipe.length !== 2) continue;
        const [input1, input2] = recipe;
        if (input1 === shard.id || input2 === shard.id) recipes.push({ input1, input2, quantity, output });
      }
    }
  }
  return recipes;
};

const Plus = () => <span className="text-purple-400">+</span>;
const Equals = () => <span className="text-purple-400">=</span>;

const StaticShard = ({ shardId, fusionData }: { shardId: string; fusionData: FusionJson }) => (
  <ShardDisplay shardId={shardId} fusionData={fusionData} tooltipVisible={false} />
);

/** Both inputs are variable: every left variant fuses with every right variant into the same output. */
const MatrixGroupRow = ({ group, fusionData }: { group: GroupedRecipe; fusionData: FusionJson }) => {
  const variantLeft = group.variantLeft!;
  const variantRight = group.variantRight!;
  const [left, setLeft] = useState(variantLeft[0]);
  const [right, setRight] = useState(variantRight[0]);

  const outputId = group.output || group.recipes[0].output;
  const quantities = [...new Set(group.recipes.map((r) => r.quantity))];

  return (
    <div className="px-2">
      <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
        <ShardPickerDropdown shardIds={variantLeft} selectedId={left} onSelect={setLeft} fusionData={fusionData} />
        <Plus />
        <ShardPickerDropdown shardIds={variantRight} selectedId={right} onSelect={setRight} fusionData={fusionData} />
        <Equals />
        {quantities.length > 1 ? (
          <div className="flex items-center gap-1">
            <StaticShard shardId={outputId} fusionData={fusionData} />
            <span className="text-xs text-slate-400">({quantities.sort((a, b) => b - a).join("/")})x</span>
          </div>
        ) : (
          <ShardDisplay shardId={outputId} quantity={quantities[0]} fusionData={fusionData} />
        )}
        <span className="text-xs text-slate-400 ml-1">({group.recipes.length} recipes)</span>
      </div>
    </div>
  );
};

/** One input is shared by every recipe in the group; the other side is picked from a dropdown. */
const CommonShardGroupRow = ({ group, fusionData }: { group: GroupedRecipe; fusionData: FusionJson }) => {
  const [recipeIndex, setRecipeIndex] = useState(0);
  const activeRecipe = group.recipes[recipeIndex] ?? group.recipes[0];

  const renderSide = (side: "input1" | "input2") => {
    if (group.commonPosition === side) return <StaticShard shardId={group.commonShard} fusionData={fusionData} />;
    const shardIds = [...new Set(group.recipes.map((r) => r[side]))];
    return (
      <ShardPickerDropdown
        shardIds={shardIds}
        selectedId={activeRecipe[side]}
        onSelect={(shardId) => setRecipeIndex(group.recipes.findIndex((r) => r[side] === shardId))}
        fusionData={fusionData}
      />
    );
  };

  return (
    <div className="px-2">
      <div className="flex flex-wrap items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
        {renderSide("input1")}
        <Plus />
        {renderSide("input2")}
        <Equals />
        <ShardDisplay shardId={activeRecipe.output} quantity={activeRecipe.quantity} fusionData={fusionData} />
      </div>
    </div>
  );
};

const SingleRecipeRow = ({ recipe, fusionData, padded }: { recipe: PairRecipe; fusionData: FusionJson; padded: boolean }) => (
  <div className={padded ? "px-2" : ""}>
    <div className="flex items-center gap-2 lg:gap-3 min-w-0 min-h-[40px]">
      <StaticShard shardId={recipe.input1} fusionData={fusionData} />
      <Plus />
      <StaticShard shardId={recipe.input2} fusionData={fusionData} />
      <Equals />
      <ShardDisplay shardId={recipe.output} quantity={recipe.quantity} fusionData={fusionData} />
    </div>
  </div>
);

interface RecipeCategoryProps {
  groups: GroupedRecipe[];
  heading: string;
  sub: string;
  colorClass: string;
  fusionData: FusionJson;
}

const groupKey = (group: GroupedRecipe) => {
  const { input1, input2, output, quantity } = group.recipes[0];
  return `${input1}-${input2}-${output}-${quantity}-${group.recipes.length}-${group.variantLeft?.join(",") ?? ""}`;
};

const RecipeCategory = ({ groups, heading, sub, colorClass, fusionData }: RecipeCategoryProps) => {
  if (!groups.length) return null;
  const single = groups.length === 1;

  return (
    <div className="space-y-3 flex justify-center flex-col">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${colorClass} mb-1`}>{heading}</h3>
        <p className="text-sm text-slate-400">{sub}</p>
      </div>
      <div
        className={`inline-grid gap-5 bg-slate-700/50 border border-slate-600/50 rounded-md p-2 lg:p-3 max-w-fit mx-auto ${
          single ? "w-fit" : "lg:grid-cols-2 lg:gap-x-10 w-full"
        }`}
      >
        {groups.map((group) => {
          // Keyed by content, not position, so a row keeps its own dropdown picks while filtering.
          const key = groupKey(group);
          if (group.matrix && group.variantLeft && group.variantRight) return <MatrixGroupRow key={key} group={group} fusionData={fusionData} />;
          if (group.isGroup) return <CommonShardGroupRow key={key} group={group} fusionData={fusionData} />;
          return <SingleRecipeRow key={key} recipe={group.recipes[0]} fusionData={fusionData} padded={!single} />;
        })}
      </div>
    </div>
  );
};

interface ShardPanelProps {
  variant: "green" | "fuchsia";
  label: string;
  question: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (shard: Shard) => void;
  selected: Shard | null;
  /** Recipe-group count; the count badge and filter box only show when this is set. */
  groupCount?: number;
  filter: string;
  onFilterChange: (value: string) => void;
}

const PANEL_COLORS = {
  green: { label: "text-green-300", dot: "bg-green-500" },
  fuchsia: { label: "text-fuchsia-300", dot: "bg-fuchsia-500" },
} as const;

const ShardPanel = ({ variant, label, question, search, onSearchChange, onSelect, selected, groupCount, filter, onFilterChange }: ShardPanelProps) => (
  <div className="bg-slate-800/40 border border-slate-600/30 rounded-md p-3 lg:p-4 flex flex-col gap-2 w-full lg:max-w-lg">
    <div className="w-full">
      <label className={`flex items-center gap-2 text-sm font-medium ${PANEL_COLORS[variant].label} mb-2`}>
        <div className={`w-2 h-2 ${PANEL_COLORS[variant].dot} rounded-full`}></div>
        {label}
      </label>
      <ShardAutocomplete
        value={search}
        onChange={onSearchChange}
        onSelect={onSelect}
        onFocus={() => search && onSearchChange("")}
        placeholder="Search for a shard..."
        className="w-full"
        searchMode="name-only"
      />
    </div>
    {selected && (
      <div className="flex items-center justify-center gap-2 lg:gap-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-300">{question}</span>
          <img src={shardIconUrl(selected.id)} alt={selected.name} className="w-5 h-5 object-contain" loading="lazy" />
          <span className={`font-semibold ${getRarityColor(selected.rarity)}`}>{selected.name}</span>
          <span className="text-slate-400">?</span>
        </div>
      </div>
    )}
    {groupCount !== undefined && (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 lg:gap-4">
        <RecipeCountBadge count={groupCount} label="Recipe Groups" variant={variant} />
        <SearchFilterInput value={filter} onChange={onFilterChange} placeholder="Filter recipes..." variant={variant} />
      </div>
    )}
  </div>
);

export const RecipePage = () => {
  const { selectedShard, setSelectedShard, selectedOutputShard, setSelectedOutputShard } = useRecipeState();
  const { fusionData, loading } = useFusionData();

  const [searchValue, setSearchValue] = useState("");
  const [outputSearchValue, setOutputSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("");

  // Exactly one of the two shards drives the page: "what can I make with X" or "how do I make X".
  const mode: RecipeMode | null = selectedShard && !selectedOutputShard ? "input" : selectedOutputShard && !selectedShard ? "output" : null;

  const { recipes, categorized } = useMemo(() => {
    if (!fusionData || !mode) return { recipes: [], categorized: EMPTY_CATEGORIES };
    const recipes = mode === "input" ? getInputRecipes(selectedShard!, fusionData) : processOutputRecipes(selectedOutputShard!, fusionData);
    return { recipes, categorized: recipes.length ? categorizeAndGroupRecipes(recipes, fusionData) : EMPTY_CATEGORIES };
  }, [fusionData, mode, selectedShard, selectedOutputShard]);

  const handleShardSelect = (shard: Shard) => {
    setSelectedShard(shard);
    setSelectedOutputShard(null);
    setOutputSearchValue("");
    setFilterValue("");
  };

  const handleOutputShardSelect = (shard: Shard) => {
    setSelectedOutputShard(shard);
    setSelectedShard(null);
    setSearchValue("");
    setFilterValue("");
  };

  if (loading && !fusionData) {
    return (
      <div className="min-h-screen">
        <div className="w-full border-b border-slate-700/30">
          <div className="px-4 py-4 flex justify-center">
            <div className="w-full max-w-lg">
              <ShardAutocomplete
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleShardSelect}
                onFocus={() => searchValue && setSearchValue("")}
                placeholder="Search for a shard..."
                className="w-full text-sm py-2 px-3"
                searchMode="name-only"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!fusionData) return null;

  const filtered = filterCategorizedRecipes(categorized, filterValue, fusionData);
  const totalGroupBlocks = filtered.special.length + filtered.id.length + filtered.chameleon.length;
  const groupCountFor = (panelMode: RecipeMode) => (!loading && mode === panelMode && recipes.length > 0 ? totalGroupBlocks : undefined);

  return (
    <div className="min-h-screen">
      <div className="px-2 sm:px-4 py-4">
        <div className="flex flex-col lg:flex-row justify-center gap-3 lg:gap-6 mb-4 lg:mb-6">
          <ShardPanel
            variant="green"
            label="Input Shard"
            question="What can you make with"
            search={searchValue}
            onSearchChange={setSearchValue}
            onSelect={handleShardSelect}
            selected={selectedShard}
            groupCount={groupCountFor("input")}
            filter={filterValue}
            onFilterChange={setFilterValue}
          />
          <ShardPanel
            variant="fuchsia"
            label="Output Shard"
            question="How to make"
            search={outputSearchValue}
            onSearchChange={setOutputSearchValue}
            onSelect={handleOutputShardSelect}
            selected={selectedOutputShard}
            groupCount={groupCountFor("output")}
            filter={filterValue}
            onFilterChange={setFilterValue}
          />
        </div>

        {mode && recipes.length > 0 ? (
          <div className="flex justify-center">
            <div className="w-full max-w-fit mx-auto space-y-8">
              {CATEGORIES.map(({ type, ...category }) => (
                <RecipeCategory key={type} {...category} groups={filtered[type]} fusionData={fusionData} />
              ))}
            </div>
          </div>
        ) : mode ? (
          <div className="text-center py-12 lg:py-16">
            <div className="text-slate-400 text-base lg:text-lg">
              {mode === "input" ? "No fusion recipes found using this shard." : "No recipes found to create this shard."}
            </div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2">
              {mode === "input" ? "This shard might not be used in any fusion recipes." : "This shard might be obtained directly or not fuseable."}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 lg:py-20">
            <div className="text-slate-400 text-lg lg:text-xl">Select an input shard or output shard to see recipes</div>
            <div className="text-slate-500 text-xs lg:text-sm mt-2 lg:mt-3 px-4">
              Choose a shard on the left to see what you can make, or on the right to see how to make it.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
