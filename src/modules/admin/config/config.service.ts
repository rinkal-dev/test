/**
 * Config Service
 * Provides application configuration for frontend
 */

import { Injectable } from '@nestjs/common';
import { appConfig } from '../../../config/app.config';
import { Amenities } from '../../../models/Amenities';

/**
 * Frontend-safe configuration
 * Only expose what the frontend needs - no secrets!
 */
export interface FrontendConfig {
  app: {
    name: string;
    version: string;
    currency: {
      code: string;
      symbol: string;
      position: 'before' | 'after';
      decimalPlaces: number;
    };
  };
  features: {
    enableSmartImport: boolean;
    enableMultipleImages: boolean;
    enableRoomManagement: boolean;
    enableAmenities: boolean;
    enableGoogleMaps: boolean;
    maintenanceMode: boolean;
  };
  hotels: {
    amenities: Array<{
      id: string;
      label: string;
      icon?: string;
      category?: string;
    }>;
    starRatings: number[];
    bedTypes: Array<{
      value: string;
      label: string;
    }>;
    maxGalleryImages: number;
    maxRoomTypes: number;
  };
  uploads: {
    maxFileSizeMB: number;
    allowedImageTypes: string[];
    folders: {
      hotels: string;
      rooms: string;
      avatars: string;
    };
  };
  validation: {
    hotel: {
      nameMinLength: number;
      nameMaxLength: number;
      addressMaxLength: number;
      cityMaxLength: number;
      countryMaxLength: number;
      descriptionMaxLength: number;
    };
    room: {
      nameMinLength: number;
      nameMaxLength: number;
      maxOccupancy: number;
      maxPrice: number;
    };
  };
  pagination: {
    defaultLimit: number;
    allowedLimits: number[];
  };
}

@Injectable()
export class AppConfigService {
  /**
   * Get frontend-safe configuration
   * Never expose sensitive data here!
   */
  async getFrontendConfig(): Promise<FrontendConfig> {
    // Fetch amenities from database
    const amenities = await this.getAmenities();

    return {
      app: {
        name: appConfig.app.name,
        version: appConfig.app.version,
        currency: appConfig.app.currency,
      },
      features: {
        enableSmartImport: appConfig.features.enableSmartImport,
        enableMultipleImages: appConfig.features.enableMultipleImages,
        enableRoomManagement: appConfig.features.enableRoomManagement,
        enableAmenities: appConfig.features.enableAmenities,
        enableGoogleMaps: appConfig.features.enableGoogleMaps,
        maintenanceMode: appConfig.features.maintenanceMode,
      },
      hotels: {
        amenities: amenities,
        starRatings: appConfig.hotels.starRatings,
        bedTypes: appConfig.hotels.bedTypes,
        maxGalleryImages: appConfig.hotels.maxGalleryImages,
        maxRoomTypes: appConfig.hotels.maxRoomTypes,
      },
      uploads: {
        maxFileSizeMB: appConfig.uploads.maxFileSizeMB,
        allowedImageTypes: appConfig.uploads.allowedImageTypes,
        folders: {
          hotels: appConfig.uploads.folders.hotels,
          rooms: appConfig.uploads.folders.rooms,
          avatars: appConfig.uploads.folders.avatars,
        },
      },
      validation: {
        hotel: {
          nameMinLength: appConfig.validation.hotel.nameMinLength,
          nameMaxLength: appConfig.validation.hotel.nameMaxLength,
          addressMaxLength: appConfig.validation.hotel.addressMaxLength,
          cityMaxLength: appConfig.validation.hotel.cityMaxLength,
          countryMaxLength: appConfig.validation.hotel.countryMaxLength,
          descriptionMaxLength: appConfig.validation.hotel.descriptionMaxLength,
        },
        room: appConfig.validation.room,
      },
      pagination: {
        defaultLimit: appConfig.pagination.defaultLimit,
        allowedLimits: appConfig.pagination.allowedLimits,
      },
    };
  }

  /**
   * Get amenities from database (dynamic)
   */
  async getAmenities() {
    const amenities = await Amenities.findAll({
      where: { is_active: true },
      order: [
        ['category', 'ASC'],
        ['sort_order', 'ASC'],
      ],
      attributes: ['uuid', 'name', 'icon', 'category'],
    });

    return amenities.map((a) => ({
      id: a.uuid,
      label: a.name,
      icon: a.icon,
      category: a.category,
    }));
  }

  getBedTypes() {
    return appConfig.hotels.bedTypes;
  }

  getStarRatings() {
    return appConfig.hotels.starRatings;
  }

  getFeatureFlags() {
    return appConfig.features;
  }

  getValidationRules() {
    return appConfig.validation;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof typeof appConfig.features): boolean {
    return appConfig.features[feature] ?? false;
  }
}
