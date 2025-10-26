/**
 * SEO utilities index
 * @module seo/utils
 */

// Re-export escape and validation utilities
export {
  escapeHtml,
  generateRobotsContent,
  validateSEOMetadata,
  detectExistingSEOTags,
} from './escape-and-validation.utils.js';

// Re-export URL utilities
export { normalizeUrlPath, resolveAbsoluteUrl, isValidUrl } from './url.utils.js';
