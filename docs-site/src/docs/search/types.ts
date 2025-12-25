/**
 * Search types matching the Stati core search index schema.
 */

export interface SearchDocument {
  /** Unique identifier (page URL + section anchor) */
  id: string;
  /** Page URL path */
  url: string;
  /** Section anchor (heading ID), empty string for page-level entry */
  anchor: string;
  /** Page title from frontmatter */
  title: string;
  /** Section heading text */
  heading: string;
  /** Heading level (1 for page title, 2-6 for headings) */
  level: number;
  /** Text content of the section (stripped of HTML) */
  content: string;
  /** Breadcrumb path for display */
  breadcrumb: string;
  /** Optional tags from frontmatter */
  tags?: string[];
}

export interface SearchIndex {
  /** Schema version */
  version: string;
  /** ISO timestamp when generated */
  generatedAt: string;
  /** Total document count */
  documentCount: number;
  /** Searchable documents */
  documents: SearchDocument[];
}

export interface SearchResult {
  /** The matched document */
  document: SearchDocument;
  /** Relevancy score (higher is better) */
  score: number;
}
