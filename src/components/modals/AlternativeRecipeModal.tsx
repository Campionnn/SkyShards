import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui";
import { X, Star, Search, Plus, ChevronDown } from "lucide-react";
import { NAME_AND_FAMILY_FILTER_CONFIG, formatLargeNumber, formatTime, getRarityColor, matchesSearchQuery, shardIconUrl } from "../../utilities";
import type { AlternativeRecipeOption, CalculationParams, Data, Recipe, Shard } from "../../types/types";
import { CalculationService } from "../../services";
import { dropdownOrder, processAlternatives, sortGroup, sortedGroupKeys, type Alternatives } from "./alternativeOptions";

interface AlternativeRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The direct-acquisition option, plus fusion alternatives grouped by shared input. */
  alternatives: Alternatives;
  onSelect: (recipe: Recipe | null) => void;
  shardName: string;
  data: Data;
  loading: boolean;
  requiredQuantity?: number;
  params: CalculationParams;
}

/** What the modal's option rows need to show cost and pick a recipe. */
interface OptionContext {
  shards: Data["shards"];
  outputShard: Shard | undefined;
  shardName: string;
  format: (value: number) => string;
  /** Total cost of `requiredQuantity` shards via the option, or null when no quantity is known. */
  totalFor: (option: AlternativeRecipeOption) => number | null;
  select: (recipe: Recipe | null) => void;
}

const CURRENT_BADGE = "px-1 py-0.4 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex-shrink-0";
const OPTION_BUTTON = "w-full p-3 rounded-lg border text-left transition-all duration-200";
const optionButtonState = (isCurrent: boolean) =>
  isCurrent ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30" : "bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500";

const CurrentBadge = ({ className = "" }: { className?: string }) => <span className={`${CURRENT_BADGE} ${className}`}>Current</span>;

const OptionCost = ({ option, context }: { option: AlternativeRecipeOption; context: OptionContext }) => {
  const total = context.totalFor(option);
  return (
    <div className="text-right">
      <div>{context.format(option.timePerShard)}</div>
      {total !== null && <div className="text-xs text-blue-400">Total: {context.format(total)}</div>}
    </div>
  );
};

const ShardAmount = ({ quantity, shardId, shard, textClass = "" }: { quantity: number; shardId: string; shard: Shard | undefined; textClass?: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-300 text-xs">{quantity}x</span>
    {shard && <img src={shardIconUrl(shardId)} alt={shard.name} className="w-4 h-4 object-contain" loading="lazy" />}
    <span className={`${shard ? getRarityColor(shard.rarity) : "text-slate-300"} ${textClass}`}>{shard?.name}</span>
  </div>
);

const DirectOption = ({ option, context, rateAsCoinValue }: { option: AlternativeRecipeOption; context: OptionContext; rateAsCoinValue: boolean }) => {
  // Not obtainable directly at all.
  if (option.timePerShard === Infinity) return null;

  return (
    <button onClick={() => context.select(option.recipe)} className={`${OPTION_BUTTON} ${optionButtonState(option.isCurrent)}`} disabled={option.isCurrent}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-green-400 font-medium text-sm">{rateAsCoinValue ? "Buy from Bazaar" : "Direct"}</span>
          {option.isCurrent && <CurrentBadge />}
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <OptionCost option={option} context={context} />
        </div>
      </div>
    </button>
  );
};

/** One fusion recipe as `a + b = output`, stacked on mobile. */
const FusionOption = ({ option, context }: { option: AlternativeRecipeOption; context: OptionContext }) => {
  if (!option.recipe) return null;
  const [firstInput, partner] = option.recipe.inputs;
  const firstShard = context.shards[firstInput];
  const partnerShard = context.shards[partner];
  if (!firstShard || !partnerShard) return null;

  const { outputShard, shardName } = context;
  const outputClass = outputShard ? getRarityColor(outputShard.rarity) : "text-slate-300";
  const outputIcon = outputShard && <img src={shardIconUrl(outputShard.id)} alt={outputShard.name} className="w-4 h-4 object-contain" loading="lazy" />;

  return (
    <button
      onClick={() => context.select(option.recipe)}
      className={`${OPTION_BUTTON} cursor-pointer ${optionButtonState(option.isCurrent)}`}
      disabled={option.isCurrent}
    >
      <div className="flex items-center justify-between text-nowrap overflow-x-auto">
        <div className="flex items-center gap-0 sm:gap-3">
          <div className="w-2 h-2 bg-purple-400 rounded-full ml-0.5" />
          <div className="flex sm:hidden ml-4">
            <div className="flex flex-col">
              <div className="mb-1 ml-5">
                <ShardAmount quantity={firstShard.fuse_amount} shardId={firstInput} shard={firstShard} textClass="text-sm" />
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-slate-400 mr-1">+</span>
                <ShardAmount quantity={partnerShard.fuse_amount} shardId={partner} shard={partnerShard} textClass="text-sm" />
              </div>
              <div className="border-t border-slate-500 my-1"></div>
              <div className="flex items-center gap-1.5 ml-5">
                <span className="text-slate-300 text-xs">{option.recipe.outputQuantity}x</span>
                {outputIcon}
                <span className={`${outputClass} text-sm`}>{shardName}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col sm:flex-row gap-1.5 text-sm">
            <ShardAmount quantity={firstShard.fuse_amount} shardId={firstInput} shard={firstShard} />
            <p className="hidden sm:block text-slate-400 mb-0.5 mx-0.5">+</p>
            <ShardAmount quantity={partnerShard.fuse_amount} shardId={partner} shard={partnerShard} />
            <p className="hidden sm:block text-slate-400 mb-0.5 mx-0.5">=</p>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 text-xs">{option.recipe.outputQuantity}x</span>
              {outputIcon}
              <span className={outputClass}>{shardName}</span>
            </div>
          </div>
          {option.isCurrent && <CurrentBadge className="ml-3 sm:ml-0" />}
        </div>
        <div className="text-slate-400 text-sm">
          <OptionCost option={option} context={context} />
        </div>
      </div>
    </button>
  );
};

/** `+ 2x Partner` with Reptile/Current badges: a dropdown row naming the group's other input. */
const PartnerSummary = ({ partnerId, partner, isCurrent }: { partnerId: string; partner: Shard | undefined; isCurrent: boolean }) => (
  <>
    <Plus className="w-4 h-4 text-fuchsia-400" />
    <span className="text-slate-400 text-xs">{partner?.fuse_amount || 2}x</span>
    <img src={shardIconUrl(partnerId)} alt={partner?.name} className="w-4 h-4 object-contain" loading="lazy" />
    <span className={`text-xs ${partner ? getRarityColor(partner.rarity) : "text-slate-300"}`}>{partner?.name || partnerId}</span>
    {partner?.family?.includes("Reptile") && (
      <span className="px-1 py-0.4 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md flex-shrink-0">Reptile</span>
    )}
    {isCurrent && <CurrentBadge />}
  </>
);

const DROPDOWN_HEIGHT = 260;

interface FusionGroupProps {
  groupShard: string;
  options: AlternativeRecipeOption[];
  context: OptionContext;
  /** The modal's scrolling body, scrolled so an opened dropdown is fully visible. */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Every recipe sharing `groupShard` as an input: the chosen one shown as an option, and
 * a searchable dropdown of the partners to switch between them.
 */
const FusionGroup = ({ groupShard, options, context, scrollContainerRef }: FusionGroupProps) => {
  const [chosenIndex, setChosenIndex] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  // A click outside every group's dropdown closes this one.
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!(event.target as Element).closest("[data-dropdown-container]")) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  const { shards } = context;
  const group = sortGroup(options);
  const partnerOf = ([a, b]: [string, string]) => (groupShard === a ? b : a);
  // Until the user picks one, show the current recipe (or the fastest).
  const currentIndex = group.findIndex((option) => option.isCurrent);
  const selectedIndex = chosenIndex ?? (currentIndex >= 0 ? currentIndex : 0);
  const selectedOption = group[selectedIndex] || group[0];
  const groupShardData = shards[groupShard];

  const listed = query.trim()
    ? group.filter((option) => {
        const partner = option.recipe && shards[partnerOf(option.recipe.inputs)];
        return !!partner && matchesSearchQuery(partner, query, NAME_AND_FAMILY_FILTER_CONFIG);
      })
    : dropdownOrder(group, shards);

  const toggle = () => {
    if (!isOpen) {
      // Once rendered, scroll the modal body so the whole dropdown is visible.
      setTimeout(() => {
        const button = buttonRef.current;
        const container = scrollContainerRef.current;
        if (!button || !container) return;
        const overflow =
          button.getBoundingClientRect().bottom - container.getBoundingClientRect().top + DROPDOWN_HEIGHT - container.getBoundingClientRect().height;
        if (overflow > 0) container.scrollBy({ top: overflow + 20 });
      }, 50);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {groupShardData && (
          <>
            <img src={shardIconUrl(groupShard)} alt={groupShardData.name} className="w-5 h-5 object-contain" loading="lazy" />
            <span className={getRarityColor(groupShardData.rarity) + " font-semibold text-base"}>{groupShardData.name}</span>
            <span className="text-xs text-slate-400">
              ({group.length} recipe{group.length !== 1 ? "s" : ""})
            </span>
          </>
        )}
      </div>

      {selectedOption && <FusionOption option={selectedOption} context={context} />}

      {group.length > 1 && (
        <div className="mt-3" data-dropdown-container>
          <button
            ref={buttonRef}
            type="button"
            onClick={toggle}
            className="w-full px-4 py-3 bg-slate-800/95 border border-slate-600/70 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:border-slate-500/80 hover:bg-slate-700/80 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOption?.recipe && (
                  <PartnerSummary
                    partnerId={partnerOf(selectedOption.recipe.inputs)}
                    partner={shards[partnerOf(selectedOption.recipe.inputs)]}
                    isCurrent={selectedOption.isCurrent}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  {selectedOption && <OptionCost option={selectedOption} context={context} />}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </button>

          {isOpen && (
            <div className="w-full mt-1 bg-slate-900/98 backdrop-blur-sm border border-slate-700/80 rounded-lg shadow-xl max-h-64 overflow-hidden">
              <div className="p-2 border-b border-slate-700/50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or family..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto pb-1">
                {listed.length === 0 ? (
                  <div className="px-4 py-3 text-center text-slate-400 text-xs">No shards found</div>
                ) : (
                  listed.map((option, idx) => {
                    if (!option.recipe) return null;
                    const partnerId = partnerOf(option.recipe.inputs);
                    const index = group.indexOf(option);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChosenIndex(index);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-800/90 transition-colors duration-150 border-b border-slate-700/40 last:border-b-0 cursor-pointer ${
                          index === selectedIndex ? "bg-purple-500/20 text-purple-200" : "text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <PartnerSummary partnerId={partnerId} partner={shards[partnerId]} isCurrent={option.isCurrent} />
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            <OptionCost option={option} context={context} />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Picker for how a tree node's shard is obtained: directly, or via any fusion recipe that makes it. */
export const AlternativeRecipeModal = ({
  isOpen,
  onClose,
  alternatives,
  onSelect,
  shardName,
  data,
  loading,
  requiredQuantity = 1,
  params,
}: AlternativeRecipeModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Each new set of alternatives starts with every group's dropdown reset.
  const [generation, setGeneration] = useState(0);
  const [lastAlternatives, setLastAlternatives] = useState(alternatives);
  if (alternatives !== lastAlternatives) {
    setLastAlternatives(alternatives);
    setGeneration(generation + 1);
  }

  useEffect(() => {
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  const outputShard = useMemo(
    () => (data?.shards ? Object.values(data.shards).find((shard) => shard.name === shardName) : undefined),
    [data?.shards, shardName],
  );
  const processed = useMemo(() => processAlternatives(alternatives, data?.shards, searchQuery), [alternatives, searchQuery, data?.shards]);

  if (!isOpen) return null;

  // A reptile recipe can overshoot: Crocodile multiplies its output, and crafts are whole.
  const totalFor = (option: AlternativeRecipeOption) => {
    if (!(requiredQuantity > 0)) return null;
    if (!option.recipe?.isReptile) return option.timePerShard * requiredQuantity;
    const { crocodileMultiplier } = CalculationService.getInstance().calculateMultipliers(params);
    const outputPerCraft = option.recipe.outputQuantity * crocodileMultiplier;
    return option.timePerShard * Math.ceil(requiredQuantity / outputPerCraft) * outputPerCraft;
  };

  const context: OptionContext = {
    shards: data?.shards ?? {},
    outputShard,
    shardName,
    format: params.rateAsCoinValue ? formatLargeNumber : formatTime,
    totalFor,
    select: (recipe) => {
      onSelect(recipe);
      onClose();
    },
  };

  const fusionCount = Object.values(processed.grouped).reduce((sum, group) => sum + group.length, 0);
  const isEmpty = processed.direct === null && fusionCount === 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy="alternative-recipe-title"
      panelClassName="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" />
            <h2 id="alternative-recipe-title" className="text-lg font-semibold text-white">
              Alternative Recipes
            </h2>
            <span className="flex items-center gap-1 text-slate-400 text-sm">
              <span>for</span>
              {outputShard && <img src={shardIconUrl(outputShard.id)} alt={outputShard.name} className="w-5 h-5 object-contain" loading="lazy" />}
              <span className={outputShard ? getRarityColor(outputShard.rarity) : "text-slate-400"}>{shardName}</span>
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by input shard name or family..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div ref={scrollContainerRef} className="p-4 overflow-y-auto flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-12 text-slate-400">{searchQuery ? `No alternatives found matching "${searchQuery}"` : "No alternatives found"}</div>
        ) : (
          <div className="space-y-4">
            {processed.direct && <DirectOption option={processed.direct} context={context} rateAsCoinValue={params.rateAsCoinValue} />}
            {sortedGroupKeys(processed.grouped).map((groupShard) => (
              <FusionGroup
                key={`${generation}-${groupShard}`}
                groupShard={groupShard}
                options={processed.grouped[groupShard]}
                context={context}
                scrollContainerRef={scrollContainerRef}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Recipes grouped by most common input • Best options shown first</span>
          <span>
            {processed.direct && processed.direct.timePerShard !== Infinity ? "1 direct + " : ""}
            {fusionCount} fusion recipe{fusionCount !== 1 ? "s" : ""}
            {searchQuery && ` (filtered)`}
          </span>
        </div>
      </div>
    </Modal>
  );
};
