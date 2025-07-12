// SEO Optimization Script
// This file contains additional SEO enhancements for SkyShards

// Dynamic meta tag updates based on page content
export const updatePageMeta = (pageType = "home", data = {}) => {
  const metaUpdates = {
    home: {
      title: "SkyShards - #1 Hypixel SkyBlock Fusion Calculator | Free Shard Optimizer",
      description:
        "The most advanced Hypixel SkyBlock fusion calculator. Calculate optimal shard fusion recipes, track costs, compare prices, and maximize your profits. Free tool used by 10,000+ players.",
      keywords: "hypixel skyblock fusion calculator, shard calculator, skyblock calculator, hypixel calculator, shard fusion, fusion recipes, shard costs, skyblock tools",
    },
    calculator: {
      title: "Shard Fusion Calculator - SkyShards | Hypixel SkyBlock Tool",
      description: "Calculate the most profitable shard fusion recipes for Hypixel SkyBlock. Real-time pricing, cost optimization, and profit maximization tools.",
      keywords: "shard fusion calculator, hypixel fusion calculator, skyblock fusion tool, shard recipes, fusion optimization",
    },
    guide: {
      title: "Ultimate Shard Fusion Guide - SkyShards | Hypixel SkyBlock",
      description: "Complete guide to shard fusion in Hypixel SkyBlock. Learn optimal strategies, best practices, and advanced techniques to maximize your profits.",
      keywords: "shard fusion guide, hypixel skyblock guide, shard fusion strategies, fusion tips, skyblock tutorial",
    },
  };

  const meta = metaUpdates[pageType] || metaUpdates.home;

  // Update document title
  document.title = meta.title;

  // Update meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", meta.description);
  }

  // Update meta keywords
  const keywordsMeta = document.querySelector('meta[name="keywords"]');
  if (keywordsMeta) {
    keywordsMeta.setAttribute("content", meta.keywords);
  }

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute("content", meta.title);
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute("content", meta.description);
  }

  // Update Twitter tags
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle) {
    twitterTitle.setAttribute("content", meta.title);
  }

  const twitterDescription = document.querySelector('meta[property="twitter:description"]');
  if (twitterDescription) {
    twitterDescription.setAttribute("content", meta.description);
  }
};

// Add structured data for specific shard types
export const addShardStructuredData = (shardData) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hypixel SkyBlock Shards",
    description: "Complete list of available shards for fusion in Hypixel SkyBlock",
    itemListElement: shardData.map((shard, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: shard.name,
      description: `${shard.name} shard for Hypixel SkyBlock fusion recipes`,
      image: `https://skyshards.com/shardIcons/${shard.icon}`,
      url: `https://skyshards.com/calculator?shard=${shard.id}`,
    })),
  };

  // Add to page
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
};

// SEO event tracking
export const trackSEOEvents = () => {
  // Track calculator usage
  if (typeof gtag !== "undefined") {
    gtag("event", "calculator_usage", {
      event_category: "SEO",
      event_label: "fusion_calculator_used",
    });
  }

  // Track time on page
  let timeOnPage = 0;
  const startTime = Date.now();

  window.addEventListener("beforeunload", () => {
    timeOnPage = Date.now() - startTime;
    if (typeof gtag !== "undefined") {
      gtag("event", "time_on_page", {
        event_category: "SEO",
        event_label: "engagement",
        value: Math.round(timeOnPage / 1000),
      });
    }
  });
};

// Initialize SEO optimizations
export const initSEO = () => {
  // Add canonical URL if not present
  if (!document.querySelector('link[rel="canonical"]')) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = window.location.href;
    document.head.appendChild(canonical);
  }

  // Add hreflang for international SEO (if needed)
  const hreflang = document.createElement("link");
  hreflang.rel = "alternate";
  hreflang.hreflang = "en";
  hreflang.href = "https://skyshards.com/";
  document.head.appendChild(hreflang);

  // Track SEO events
  trackSEOEvents();
};

// Export functions for use in the app
export default {
  updatePageMeta,
  addShardStructuredData,
  trackSEOEvents,
  initSEO,
};
