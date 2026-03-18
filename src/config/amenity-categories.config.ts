/**
 * Amenity Categories Configuration
 *
 * Defines all allowed amenity categories with their labels and default icons.
 * Used by Smart Import to auto-categorize amenities from AI.
 *
 * Icons are from Lucide React (used in frontend).
 * See: https://lucide.dev/icons
 */

export interface AmenityCategory {
  key: string;
  label: string;
  icon: string;
  description: string;
}

/**
 * Available amenity categories
 * Key is stored in database, label is displayed in UI
 */
export const AMENITY_CATEGORIES: Record<string, AmenityCategory> = {
  recreation: {
    key: 'recreation',
    label: 'Recreation',
    icon: 'waves',
    description: 'Swimming pools, fitness center, spa, sports facilities',
  },
  dining: {
    key: 'dining',
    label: 'Dining',
    icon: 'utensils',
    description: 'Restaurants, bars, room service, breakfast',
  },
  connectivity: {
    key: 'connectivity',
    label: 'Connectivity',
    icon: 'wifi',
    description: 'WiFi, business center, meeting rooms',
  },
  services: {
    key: 'services',
    label: 'Services',
    icon: 'concierge-bell',
    description: 'Parking, shuttle, concierge, laundry',
  },
  room: {
    key: 'room',
    label: 'Room Features',
    icon: 'bed',
    description: 'Air conditioning, minibar, safe, balcony',
  },
  family: {
    key: 'family',
    label: 'Family',
    icon: 'baby',
    description: 'Kids club, babysitting, family rooms',
  },
  pet: {
    key: 'pet',
    label: 'Pet Friendly',
    icon: 'paw-print',
    description: 'Pet allowed, pet services',
  },
  accessibility: {
    key: 'accessibility',
    label: 'Accessibility',
    icon: 'accessibility',
    description: 'Wheelchair access, accessible rooms',
  },
  general: {
    key: 'general',
    label: 'General',
    icon: 'star',
    description: 'Other amenities',
  },
};

/**
 * Get all category keys (for validation)
 */
export const getAmenityCategoryKeys = (): string[] => {
  return Object.keys(AMENITY_CATEGORIES);
};

/**
 * Get category by key
 */
export const getAmenityCategory = (key: string): AmenityCategory | null => {
  return AMENITY_CATEGORIES[key] || null;
};

/**
 * Check if category key is valid
 */
export const isValidAmenityCategory = (key: string): boolean => {
  return key in AMENITY_CATEGORIES;
};

/**
 * Get default icon for a category (fallback to 'star')
 */
export const getCategoryIcon = (categoryKey: string): string => {
  return AMENITY_CATEGORIES[categoryKey]?.icon || 'star';
};

/**
 * Get all categories as array (for API response / dropdowns)
 */
export const getAmenityCategoriesList = (): AmenityCategory[] => {
  return Object.values(AMENITY_CATEGORIES);
};

/**
 * Category keys formatted for Gemini prompt
 */
export const getCategoriesForPrompt = (): string => {
  return Object.entries(AMENITY_CATEGORIES)
    .map(([key, cat]) => `- ${key}: ${cat.description}`)
    .join('\n');
};
