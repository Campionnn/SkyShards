import React, { createContext, useContext, useEffect, useState } from "react";
import { imagePreloader, SHARD_ICON_IDS } from "../utilities";

interface ImagePreloadContextValue {
  isReady: boolean;
}

const ImagePreloadContext = createContext<ImagePreloadContextValue>({
  isReady: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useImagePreload = () => useContext(ImagePreloadContext);

interface ImagePreloadProviderProps {
  children: React.ReactNode;
}

export const ImagePreloadProvider: React.FC<ImagePreloadProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const preloadImages = async () => {
      try {
        await imagePreloader.preloadShardIcons(SHARD_ICON_IDS);
        setIsReady(true);
      } catch (error) {
        console.error("Failed to preload images:", error);
        // Still mark as ready to allow the app to function
        setIsReady(true);
      }
    };

    preloadImages();
  }, []);

  return (
    <ImagePreloadContext.Provider value={{ isReady }}>
      {children}
    </ImagePreloadContext.Provider>
  );
};
