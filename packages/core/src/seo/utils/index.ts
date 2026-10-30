/**
 * SEO utilities index
 * @module seo/utils
 */

// Re-export escape and validation utilities
export {
  escapeHtml,
  removeInvalidXmlChars,
  generateRobotsContent,
  parseRobotsDirectives,
  validateSEOMetadata,
  detectExistingSEOTags,
} from './escape-and-validation.utils.js';

// Re-export URL utilities
export { normalizeUrlPath, resolveAbsoluteUrl, percentEncodeUrl, isValidUrl } from './url.utils.js';
