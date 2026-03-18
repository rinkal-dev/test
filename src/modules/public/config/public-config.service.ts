/**
 * Public Config Service
 * Provides public configuration for frontend (Google API keys, etc.)
 *
 * NOTE: Only expose keys that are safe for public/frontend use.
 * Google Maps API keys with HTTP referrer restrictions are safe to expose.
 */

import { Injectable } from '@nestjs/common';
import { getEnvironmentData } from '../../../helpers/general';

@Injectable()
export class PublicConfigService {
  /**
   * Get Google Places API key
   * This key should have HTTP referrer restrictions in Google Cloud Console
   */
  getGooglePlacesApiKey(): string {
    return getEnvironmentData('GOOGLE_PLACES_API_KEY') || '';
  }

  /**
   * Check if Google Places is configured
   */
  isGooglePlacesConfigured(): boolean {
    const key = this.getGooglePlacesApiKey();
    return !!key && key.startsWith('AIza');
  }

  /**
   * Get all public config for frontend
   */
  getPublicConfig() {
    return {
      google: {
        places_api_key: this.getGooglePlacesApiKey(),
        is_configured: this.isGooglePlacesConfigured(),
      },
    };
  }
}
