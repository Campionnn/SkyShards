import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the files
const descPath = path.join(__dirname, "public", "desc.json");
const fusionDataPath = path.join(__dirname, "public", "fusion-data.json");

const desc = JSON.parse(fs.readFileSync(descPath, "utf8"));
const fusionData = JSON.parse(fs.readFileSync(fusionDataPath, "utf8"));

// Build the new SHARD_DESCRIPTIONS content
let content = `// Shard descriptions for tooltips - unified source from desc.json and fusion-data.json
export const SHARD_DESCRIPTIONS = {
`;

for (const [shardId, shardDesc] of Object.entries(desc)) {
  const { title, description, family, type } = shardDesc;
  const fusionShard = fusionData.shards[shardId];
  const rarity = fusionShard ? fusionShard.rarity.toUpperCase() : "COMMON";

  content += `  ${shardId}: {
    title: "${title.replace(/"/g, '\\"')}",
    description: "${description.replace(/"/g, '\\"')}",
    family: "${family}",
    type: "${type}",
    rarity: "${rarity}",
  },
`;
}

content += `};
`;

// Write the updated petToShardMap.ts file
const petToShardMapPath = path.join(__dirname, "src", "constants", "petToShardMap.ts");
fs.writeFileSync(petToShardMapPath, content);
console.log("Updated petToShardMap.ts with unified SHARD_DESCRIPTIONS");
