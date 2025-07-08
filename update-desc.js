import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current desc.json file
const descPath = path.join(__dirname, "public", "desc.json");
const fusionDataPath = path.join(__dirname, "public", "fusion-data.json");

const desc = JSON.parse(fs.readFileSync(descPath, "utf8"));
const fusionData = JSON.parse(fs.readFileSync(fusionDataPath, "utf8"));

// Convert desc.json format from arrays to objects with family and type
const updatedDesc = {};

for (const [shardId, [title, description]] of Object.entries(desc)) {
  const shardData = fusionData.shards[shardId];

  if (shardData) {
    updatedDesc[shardId] = {
      title,
      description,
      family: shardData.family,
      type: shardData.type,
    };
  } else {
    // If not found in fusion-data, keep the old format but warn
    console.warn(`Shard ${shardId} not found in fusion-data.json`);
    updatedDesc[shardId] = {
      title,
      description,
      family: "Unknown Family",
      type: "Unknown",
    };
  }
}

// Write the updated desc.json file
fs.writeFileSync(descPath, JSON.stringify(updatedDesc, null, 2));
console.log("Updated desc.json with family and type information");
