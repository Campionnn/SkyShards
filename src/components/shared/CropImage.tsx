import React, { useState, type CSSProperties } from "react";
import { getCropImagePath, getGroundImagePath } from "../../types/greenhouse";
import { CROP_IMAGE_GLOW_FILTER, needsCropGlow } from "../../constants";

export type CropImageSize = "xs" | "sm" | "md" | "lg" | "xl" | "full" | "custom";

export interface CropImageProps {
  // Required: Crop identification
  cropId: string;
  cropName: string;
  
  // Optional: Ground tile
  showGround?: boolean;
  groundType?: string;
  hasGroundContext?: boolean; // True if ground is rendered by parent container
  
  // Optional: Sizing
  size?: CropImageSize;
  width?: number | string;
  height?: number | string;
  
  // Optional: Visual effects
  needsGlow?: boolean; // Auto-detect if not specified
  applyPixelated?: boolean;
  
  // Optional: Styling
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
  
  // Optional: Error handling
  showFallback?: boolean; // Show crop initials on error
  fallbackText?: string; // Custom fallback text
  fallbackClassName?: string;
  
  // Optional: Drag behavior
  draggable?: boolean;
  
  // Optional: Callbacks
  onError?: () => void;
  onClick?: () => void;
}

// Size presets for common use cases
const SIZE_PRESETS: Record<Exclude<CropImageSize, "custom" | "full">, { width: number; height: number }> = {
  xs: { width: 24, height: 24 },   // 24px - Small icons
  sm: { width: 32, height: 32 },   // 32px - Palette tiles
  md: { width: 48, height: 48 },   // 48px - List items
  lg: { width: 64, height: 64 },   // 64px - Grid cells
  xl: { width: 96, height: 96 },   // 96px - Large previews
};

/**
 * Shared CropImage component for rendering crop/mutation images
 * Supports ground tiles, automatic glow effects, error handling, and multiple size presets
 * 
 * @example
 * // Basic usage
 * <CropImage cropId="wheat" cropName="Wheat" size="md" />
 * 
 * @example
 * // With ground tile
 * <CropImage 
 *   cropId="choconut" 
 *   cropName="Choconut"
 *   size="lg"
 *   showGround
 *   groundType="farmland"
 * />
 * 
 * @example
 * // Custom size
 * <CropImage 
 *   cropId="dead_plant" 
 *   cropName="Dead Plant"
 *   width={128}
 *   height={128}
 * />
 */
export const CropImage: React.FC<CropImageProps> = ({
  cropId,
  cropName,
  showGround = false,
  groundType = "farmland",
  hasGroundContext = false,
  size = "md",
  width,
  height,
  needsGlow: glowOverride,
  applyPixelated = true,
  className = "",
  imageClassName = "",
  style = {},
  imageStyle = {},
  showFallback = true,
  fallbackText,
  fallbackClassName = "",
  draggable = false,
  onError,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Determine dimensions
  let finalWidth: number | string;
  let finalHeight: number | string;
  
  if (width !== undefined || height !== undefined) {
    // Custom dimensions provided
    finalWidth = width ?? height ?? "100%";
    finalHeight = height ?? width ?? "100%";
  } else if (size === "full") {
    // Full size (inherit from parent)
    finalWidth = "100%";
    finalHeight = "100%";
  } else if (size === "custom") {
    // Custom size via style prop
    finalWidth = style.width ?? "100%";
    finalHeight = style.height ?? "100%";
  } else {
    // Use preset
    const preset = SIZE_PRESETS[size];
    finalWidth = preset.width;
    finalHeight = preset.height;
  }
  
  // Determine if glow is needed
  // Only apply glow if ground is actually being shown (by us or by parent)
  const shouldGlow = glowOverride ?? ((showGround || hasGroundContext) && needsCropGlow(cropId, groundType));
  
  // Container style (with optional ground tile)
  const containerStyle: CSSProperties = {
    ...style,
    width: finalWidth,
    height: finalHeight,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(showGround && {
      backgroundImage: `url(${getGroundImagePath(groundType)})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }),
  };
  
  // Image style
  const finalImageStyle: CSSProperties = {
    ...imageStyle,
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    ...(applyPixelated && { imageRendering: "pixelated" as any }),
    ...(shouldGlow && { filter: CROP_IMAGE_GLOW_FILTER }),
  };
  
  // Handle image error
  const handleError = () => {
    setImageError(true);
    onError?.();
  };
  
  // Render fallback if image failed to load and fallback is enabled
  if (imageError && showFallback) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={containerStyle}
        onClick={onClick}
      >
        <span className={`text-xs font-medium text-slate-400 ${fallbackClassName}`}>
          {fallbackText ?? cropName?.slice(0, 2).toUpperCase() ?? "??"}
        </span>
      </div>
    );
  }
  
  // If image failed and no fallback, render nothing
  if (imageError && !showFallback) {
    return null;
  }
  
  return (
    <div
      className={className}
      style={containerStyle}
      onClick={onClick}
    >
      <img
        src={getCropImagePath(cropId)}
        alt={cropName || cropId}
        className={`object-contain pointer-events-none ${imageClassName}`}
        style={finalImageStyle}
        onError={handleError}
        draggable={draggable}
      />
    </div>
  );
};

/**
 * Preset component for palette tiles (small square tiles with border)
 */
export const CropImageTile: React.FC<Omit<CropImageProps, "size">> = (props) => {
  return <CropImage {...props} size="sm" />;
};

/**
 * Preset component for list items (medium size with padding)
 */
export const CropImageListItem: React.FC<Omit<CropImageProps, "size">> = (props) => {
  return <CropImage {...props} size="md" />;
};

/**
 * Preset component for grid cells (large with ground tile support)
 */
export const CropImageGridCell: React.FC<Omit<CropImageProps, "size" | "showGround"> & { showGround?: boolean }> = ({ showGround = true, ...props }) => {
  return <CropImage {...props} size="lg" showGround={showGround} />;
};
