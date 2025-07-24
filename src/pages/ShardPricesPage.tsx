import React, { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, DollarSign, TrendingUp, TrendingDown, Clock, Info } from "lucide-react";
import { useFusionData } from "../hooks";
import HypixelApiService from "../services/hypixelApiService";
import type { ShardPriceData } from "../services/hypixelApiService";
import { getRarityColor } from "../utilities";

const ShardPricesPage: React.FC = () => {
  const { fusionData, loading: dataLoading } = useFusionData();
  const [priceData, setPriceData] = useState<ShardPriceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "instantBuy" | "instantSell" | "buyOrder" | "sellOrder">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const hypixelApi = HypixelApiService.getInstance();

  const fetchPrices = async () => {
    if (!fusionData?.shards) return;

    setLoading(true);
    setError(null);

    try {
      const shardIds = Object.keys(fusionData.shards);
      const prices = await hypixelApi.getShardPrices(shardIds, fusionData.shards);
      setPriceData(prices);
    } catch (err) {
      setError("Failed to fetch shard prices from Hypixel API");
      console.error("Error fetching prices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [fusionData]);

  const filteredAndSortedShards = useMemo(() => {
    if (!priceData.length) return [];

    let filtered = priceData;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((shard) => shard.shardName.toLowerCase().includes(query) || shard.shardId.toLowerCase().includes(query));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number = a.shardName;
      let bValue: string | number = b.shardName;

      if (sortBy === "instantBuy") {
        aValue = a.instantBuy;
        bValue = b.instantBuy;
      } else if (sortBy === "instantSell") {
        aValue = a.instantSell;
        bValue = b.instantSell;
      } else if (sortBy === "buyOrder") {
        aValue = a.buyOrder;
        bValue = b.buyOrder;
      } else if (sortBy === "sellOrder") {
        aValue = a.sellOrder;
        bValue = b.sellOrder;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [priceData, searchQuery, sortBy, sortOrder]);

  const handleSort = (field: "name" | "instantBuy" | "instantSell" | "buyOrder" | "sellOrder") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: "name" | "instantBuy" | "instantSell" | "buyOrder" | "sellOrder") => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getShardRarity = (shardId: string) => {
    return fusionData?.shards?.[shardId]?.rarity || "common";
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!fusionData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg mb-2">Failed to load shard data</div>
        <div className="text-slate-400">Please try refreshing the page</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-green-400" />
          <h1 className="text-3xl font-bold text-white">Shard Prices</h1>
        </div>
        <p className="text-slate-400">Real-time shard prices from Hypixel SkyBlock Bazaar</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search shards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchPrices}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-300 mb-1">
            <Info className="w-4 h-4" />
            <span className="text-sm">Total Shards</span>
          </div>
          <div className="text-2xl font-bold text-white">{filteredAndSortedShards.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-300 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Available on Bazaar</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{filteredAndSortedShards.filter((s) => s.available).length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-300 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last Updated</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{priceData.length > 0 ? hypixelApi.formatLastUpdated(priceData[0].lastUpdated) : "N/A"}</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 text-slate-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-2">Shard {getSortIcon("name")}</div>
                </th>
                <th className="text-right p-4 text-slate-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("instantBuy")}>
                  <div className="flex items-center justify-end gap-2">Instant Buy {getSortIcon("instantBuy")}</div>
                </th>
                <th className="text-right p-4 text-slate-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("instantSell")}>
                  <div className="flex items-center justify-end gap-2">Instant Sell {getSortIcon("instantSell")}</div>
                </th>
                <th className="text-right p-4 text-slate-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("buyOrder")}>
                  <div className="flex items-center justify-end gap-2">Buy Order {getSortIcon("buyOrder")}</div>
                </th>
                <th className="text-right p-4 text-slate-300 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("sellOrder")}>
                  <div className="flex items-center justify-end gap-2">Sell Order {getSortIcon("sellOrder")}</div>
                </th>
                <th className="text-center p-4 text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedShards.map((shard) => (
                <tr key={shard.shardId} className="border-b border-slate-700/50 hover:bg-slate-700/25 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={`${import.meta.env.BASE_URL}shardIcons/${shard.shardId}.png`} alt={shard.shardName} className="w-8 h-8 object-contain" loading="lazy" />
                      <div>
                        <div className={`font-medium ${getRarityColor(getShardRarity(shard.shardId))}`}>{shard.shardName}</div>
                        <div className="text-xs text-slate-500">{shard.shardId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-yellow-200 font-medium">{shard.available ? `${hypixelApi.formatPrice(shard.instantBuy)} coins` : "N/A"}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-yellow-200 font-medium">{shard.available ? `${hypixelApi.formatPrice(shard.instantSell)} coins` : "N/A"}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-yellow-200 font-medium">{shard.available ? `${hypixelApi.formatPrice(shard.buyOrder)} coins` : "N/A"}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-yellow-200 font-medium">{shard.available ? `${hypixelApi.formatPrice(shard.sellOrder)} coins` : "N/A"}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        shard.available ? "bg-green-900/20 text-green-400 border border-green-500/20" : "bg-slate-700/50 text-slate-400 border border-slate-600/20"
                      }`}
                    >
                      {shard.available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedShards.length === 0 && !loading && <div className="text-center py-12 text-slate-400">No shards found matching your criteria</div>}

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="text-sm text-slate-400">
          <p className="mb-2">
            <strong>Price Types:</strong>
          </p>
          <ul className="space-y-1 text-xs">
            <li>
              <span className="text-yellow-400">Instant Buy:</span> Price to buy immediately from bazaar
            </li>
            <li>
              <span className="text-yellow-400">Instant Sell:</span> Price to sell immediately to bazaar
            </li>
            <li>
              <span className="text-yellow-400">Buy Order:</span> Highest price someone is willing to pay
            </li>
            <li>
              <span className="text-yellow-400">Sell Order:</span> Lowest price someone is willing to sell
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">Prices are fetched from Hypixel SkyBlock Bazaar API and cached for 1 minute. Some shards may not be available on the bazaar.</p>
        </div>
      </div>
    </div>
  );
};

export default ShardPricesPage;
