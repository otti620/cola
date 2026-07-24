// Coca-Cola Investor & Brand Asset Repository
// High-resolution strategic marketing assets for product markers, investor pitch decks, background themes, and partner headshots.

export interface BrandAsset {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  tag: string;
  category: "hero" | "product" | "growth" | "network" | "architecture" | "retail";
  description: string;
}

export const COCA_COLA_BRAND_ASSETS = {
  // Image 1: Consistent Branding Red Bottle Close-Up
  consistentBranding: {
    id: "img_consistent_branding",
    title: "Consistent Global Dividend Heritage",
    subtitle: "Everything changes. Except what makes it Coca-Cola.",
    tag: "Brand Consistency",
    url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1200",
    category: "hero",
    description: "Iconic glass contour bottle with condensation on signature crimson background."
  },

  // Image 2: Multi-Pack Packaging Matrix
  productPortfolioMatrix: {
    id: "img_portfolio_matrix",
    title: "Iconic Inside. Timeless Outside.",
    subtitle: "Complete Bottling & Distribution Packaging Portfolio",
    tag: "Multi-Pack Inventory",
    url: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&q=80&w=1200",
    category: "product",
    description: "Comprehensive product matrix showcasing 24-can crates, Zero Sugar, Glass bottles, and aluminum packs."
  },

  // Image 3: Effervescent Fizz Splash "Open Happiness"
  fizzSplashHappiness: {
    id: "img_fizz_splash",
    title: "FIZZZSHH - Open Daily Yields",
    subtitle: "Effervescent Capital Growth & Daily Dividend Payouts",
    tag: "Instant Payouts",
    url: "https://images.unsplash.com/photo-1567103472667-6898f3a79cf2?auto=format&fit=crop&q=80&w=1200",
    category: "growth",
    description: "Explosive liquid bubble splash art symbolizing instant cashflow and happiness."
  },

  // Image 4: Real Magic Global Distribution Grid
  realMagicCollage: {
    id: "img_real_magic_grid",
    title: "Real Magic Global Retail Network",
    subtitle: "Pan-African & Global Billboard Distribution Coverage",
    tag: "Global Footprint",
    url: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=1200",
    category: "network",
    description: "9-panel lifestyle and urban campaign collage showcasing global consumer engagement."
  },

  // Image 5: Architectural 3D Sign "Enjoy. Coca-Cola"
  architecturalCube: {
    id: "img_architectural_cube",
    title: "Institutional Corporate Outlets & Logistics Hubs",
    subtitle: "Enjoy. Coca-Cola Strategic Retail Facilities",
    tag: "Corporate Facilities",
    url: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&q=80&w=1200",
    category: "architecture",
    description: "Sleek modern 3D architectural signage representing physical enterprise infrastructure."
  },

  // Image 6: Storefront Display "It's a kind of meal."
  mealSignage: {
    id: "img_meal_signage",
    title: "Commercial Food Service & Retail Partnerships",
    subtitle: "It's a kind of meal. Everyday Consumer Demand",
    tag: "Commercial Demand",
    url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=1200",
    category: "retail",
    description: "Retail storefront window display showcasing glass contour bottle with food pairing synergy."
  }
};

export const INVESTOR_HEADSHOTS = [
  {
    name: "Dr. James O. Adebayo",
    role: "Chief Investment Officer, Coca-Cola Bottling Africa",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300",
    badge: "Verified Institutional Partner",
    quote: "Our automated yield settlement architecture guarantees 100% daily capital protection for registered investors.",
    stake: "₦250,000,000 Capital Allocated"
  },
  {
    name: "Sarah Jenkins, CFA",
    role: "VP Pan-African Beverage Distribution Fund",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300",
    badge: "Lead Equity Syndicate",
    quote: "With 24/7 NIBSS interbank clearance, user returns are deposited directly without manual friction.",
    stake: "₦180,000,000 Capital Allocated"
  },
  {
    name: "Alhaji Ibrahim Danjuma",
    role: "Chairman, Northern Nigeria Logistics Consortium",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
    badge: "Strategic Bottling Trustee",
    quote: "Expanding supply chains across 36 states with direct daily dividend yields for retail investors.",
    stake: "₦500,000,000 Capital Allocated"
  }
];
