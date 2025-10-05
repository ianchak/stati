/**
 * SEO utilities index
 * @module seo/utils
 */

// Re-export escape and validation utilities
export {
  escapeHtml,
  sanitizeStructuredData,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
} from './escape-and-validation.js';

// Re-export URL utilities
export { normalizeUrlPath, resolveAbsoluteUrl, isValidUrl } from './url.js';
