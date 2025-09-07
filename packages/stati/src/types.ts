import type MarkdownIt from 'markdown-it';

export interface AgingRule {
  untilDays: number;
  ttlSeconds: number;
}

export interface ISGConfig {
  enabled?: boolean;
  ttlSeconds?: number;
  maxAgeCapDays?: number;
  aging?: AgingRule[];
}

export interface SiteConfig {
  title: string;
  baseUrl: string;
  defaultLocale?: string;
}

export interface StatiConfig {
  srcDir?: string;
  outDir?: string;
  templateDir?: string;
  staticDir?: string;
  site: SiteConfig;
  markdown?: {
    configure?: (md: MarkdownIt) => void;
  };
  eta?: {
    filters?: Record<string, (x: unknown) => unknown>;
  };
  isg?: ISGConfig;
  hooks?: BuildHooks;
}

export interface BuildContext {
  config: StatiConfig;
  pages: PageModel[];
}

export interface PageContext {
  page: PageModel;
  config: StatiConfig;
}

export interface BuildHooks {
  beforeAll?: (ctx: BuildContext) => Promise<void> | void;
  afterAll?: (ctx: BuildContext) => Promise<void> | void;
  beforeRender?: (ctx: PageContext) => Promise<void> | void;
  afterRender?: (ctx: PageContext) => Promise<void> | void;
}

export interface PageModel {
  slug: string;
  url: string;
  sourcePath: string;
  frontMatter: FrontMatter;
  content: string;
  publishedAt?: Date;
}

export interface FrontMatter {
  title?: string;
  description?: string;
  tags?: string[];
  layout?: string;
  order?: number;
  publishedAt?: string;
  ttlSeconds?: number;
  maxAgeCapDays?: number;
  draft?: boolean;
  [key: string]: unknown;
}
