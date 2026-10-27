import { Tooltip } from "../ui";

const SOURCES: [bonus: number, source: string][] = [
  [50, "HotF 3 perk"],
  [50, "Hunting level 50"],
  [30, "David's Cloak (Attribute Stacks 30)"],
  [30, "Safari Belt (Max Haunted Biome Milestone)"],
  [13, "Megalith (Sea Serpent + Tiamat max)"],
  [4, "Safari Belt Mythic Reforge"],
  [3, "Infernal Kuudra Core"],
  [1, "Starborn Century Cake"],
];

/** Hunting Fortune from every universal source; "Max Stats" sets the form to this. */
export const MAX_HUNTER_FORTUNE = SOURCES.reduce((sum, [bonus]) => sum + bonus, 0);

/** Extra fortune per rarity from the maxed leveled shard that grants it. */
const RARITY_BONUSES = [
  { rarity: "Common", color: "text-white", bonus: 26, shard: "Newt" },
  { rarity: "Uncommon", color: "text-green-400", bonus: 26, shard: "Salamander" },
  { rarity: "Rare", color: "text-blue-400", bonus: 13, shard: "Lizard King" },
  { rarity: "Epic", color: "text-purple-400", bonus: 13, shard: "Leviathan" },
  { rarity: "Legendary", color: "text-yellow-400", bonus: 0, shard: "" },
];

/** Where Hunting Fortune comes from, and the per-rarity totals at max. */
export const HunterFortuneTooltip = () => (
  <Tooltip
    shardName="Hunting Fortune"
    rarity="legendary"
    title=""
    showRomanNumerals={false}
    content={
      <div className="space-y-2">
        <div className="text-slate-200 font-semibold">Sources</div>
        <ul className="space-y-0.5">
          {SOURCES.map(([bonus, source]) => (
            <li key={source}>
              <span className="font-semibold">+{bonus}</span> <span className="text-slate-300">{source}</span>
            </li>
          ))}
        </ul>
        <div className="h-px bg-white/10"></div>
        <div className="text-slate-300">
          Universal fortune total: <span className="text-amber-300 font-semibold">{MAX_HUNTER_FORTUNE}</span>
        </div>

        <div className="text-slate-200 font-semibold pt-1">Rarity bonuses</div>
        <ul className="pl-0 space-y-0.5 text-xs">
          {RARITY_BONUSES.map(({ rarity, color, bonus, shard }) => (
            <li key={rarity} className="flex items-center justify-between">
              <span>
                <span className={`font-semibold ${color}`}>+{bonus}</span> <span className={color}>{rarity}</span>
              </span>
              <span className="text-slate-400">{shard}</span>
            </li>
          ))}
        </ul>

        <div className="text-slate-200 font-semibold pt-1">Totals</div>
        <ul className="pl-0 space-y-0.5 text-xs">
          {RARITY_BONUSES.map(({ rarity, color, bonus }) => (
            <li key={rarity} className="flex items-center justify-between">
              <span className={color}>{rarity}</span>
              <span className={`${color} font-semibold`}>{MAX_HUNTER_FORTUNE + bonus}</span>
            </li>
          ))}
        </ul>
      </div>
    }
  />
);
