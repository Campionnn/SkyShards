export class ImagePreloader {
  private static instance: ImagePreloader;
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loading: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader();
    }
    return ImagePreloader.instance;
  }

  async preloadShardIcons(shardIds: string[]): Promise<void> {
    // Return existing loading promise if already loading
    if (this.loading) {
      return this.loading;
    }

    // Return immediately if already loaded
    if (this.loadedImages.size === shardIds.length) {
      return Promise.resolve();
    }

    this.loading = this.loadImages(shardIds);
    return this.loading;
  }

  private async loadImages(shardIds: string[]): Promise<void> {
    const baseUrl = import.meta.env.BASE_URL;

    // Create promises for all images
    const imagePromises = shardIds.map((shardId) => {
      // Skip if already loaded
      if (this.loadedImages.has(shardId)) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = () => {
          this.loadedImages.set(shardId, img);
          resolve();
        };

        img.onerror = () => {
          console.warn(`Failed to load shard icon: ${shardId}`);
          resolve(); // Resolve anyway to not block other images
        };

        img.src = `${baseUrl}shardIcons/${shardId}.png`;
      });
    });

    await Promise.all(imagePromises);
    this.loading = null;
  }

  getImageSrc(shardId: string): string {
    const baseUrl = import.meta.env.BASE_URL;
    return `${baseUrl}shardIcons/${shardId}.png`;
  }

  isLoaded(): boolean {
    return this.loading === null && this.loadedImages.size > 0;
  }

  clear(): void {
    this.loadedImages.clear();
    this.loading = null;
  }
}

export const imagePreloader = ImagePreloader.getInstance();
