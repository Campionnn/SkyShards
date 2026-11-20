import { useEffect, useState } from "react";
import {
  loadDisabledShards,
  loadInventory,
  loadOwnedAttributes,
  loadUseInventory,
  saveDisabledShards,
  saveInventory,
  saveOwnedAttributes,
  saveUseInventory,
} from "../../utilities";

/** The player's imported shards and attributes, and the inventory toggle, persisted to localStorage. */
export const useInventoryState = () => {
  const [useInventory, setUseInventory] = useState(loadUseInventory);
  const [inventory, setInventory] = useState(loadInventory);
  const [ownedAttributes, setOwnedAttributes] = useState(loadOwnedAttributes);
  /** Owned shards the player excluded from inventory-aware calculations. */
  const [disabledShards, setDisabledShards] = useState(loadDisabledShards);

  useEffect(() => saveUseInventory(useInventory), [useInventory]);
  useEffect(() => saveInventory(inventory), [inventory]);
  useEffect(() => saveOwnedAttributes(ownedAttributes), [ownedAttributes]);
  useEffect(() => saveDisabledShards(disabledShards), [disabledShards]);

  return { useInventory, setUseInventory, inventory, setInventory, ownedAttributes, setOwnedAttributes, disabledShards, setDisabledShards };
};
