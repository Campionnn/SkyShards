/** Shard icons live in public/shardIcons and are addressed by shard id. */
export const shardIconUrl = (shardId: string) => `${import.meta.env.BASE_URL}shardIcons/${shardId}.png`;
