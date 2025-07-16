// Simple test to verify wooden bait exclusion logic
const WOODEN_BAIT_SHARDS = ["R29", "L23", "R59", "R23", "R49"];

function isDirectShard(shardId, noWoodenBait) {
  // If wooden bait is excluded, don't show wooden bait shards as direct
  if (noWoodenBait && WOODEN_BAIT_SHARDS.includes(shardId)) {
    console.log(`Excluding ${shardId} from direct shards due to wooden bait exclusion`);
    return false;
  }

  // Simulate shard having a rate
  return true;
}

// Test cases
console.log("Testing wooden bait exclusion:");
console.log("R49 with noWoodenBait=true:", isDirectShard("R49", true));
console.log("R49 with noWoodenBait=false:", isDirectShard("R49", false));
console.log("R1 with noWoodenBait=true:", isDirectShard("R1", true));
