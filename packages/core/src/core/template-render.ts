/**
 * Template composition: `stati.include()`, `stati.layout()` and `stati.body`, rendered on demand
 * inside a per-page render scope that records every template and name lookup for the ISG cache.
 * @module core/template-render
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { EtaParseError, type Eta } from 'eta';
import type {
  Logger,
  PageModel,
  TemplateIncludeFunction,
  TemplateLayoutFunction,
  TemplateLookup,
} from '../types/index.js';
import {
  type TemplateIndex,
  type TemplateName,
  lookupFolders,
  parseTemplateName,
  templateFolderOf,
} from './template-index.js';
import {
  createValidatingContextProxy,
  parseEtaError,
  TemplateError,
  TemplateUsageError,
} from './utils/index.js';

/**
 * Templates nested deeper than this are an error. It stops a component that includes itself
 * with props from recursing forever; real component trees are far shallower.
 */
export const MAX_TEMPLATE_DEPTH = 100;

/**
 * The values every template of one render shares, such as `site`, `page` and `helpers`, and an
 * id: the page's layout and its Open Graph template render with different values, so includes
 * cached for one must not be reused by the other.
 */
export interface BaseContext {
  readonly id: string;
  readonly values: Record<string, unknown>;
}

/** Marks a render whose context has no `body` key: the page's layout and the Open Graph template */
const NO_BODY = Symbol('no body');

/** One template to render, and what it receives. */
interface RenderFrame {
  /** The template file, relative to the source directory; null for the built-in Open Graph template */
  readonly file: string | null;
  /** The template source, for a template without a file */
  readonly source?: string;
  readonly props: Record<string, unknown> | undefined;
  readonly body: string | undefined | typeof NO_BODY;
}

/** The parent a render asked for with `stati.layout()`. */
interface LayoutSlot {
  target: { file: string; props: Record<string, unknown> | undefined } | null;
  calls: number;
  /** Set once the template has rendered; a later `stati.layout()` call is an error */
  closed: boolean;
}

/** What a render scope needs from the page being rendered. */
export interface RenderScopeOptions {
  page: PageModel;
  eta: Eta;
  index: TemplateIndex;
  logger: Logger;
  /** Development renders throw errors to the error overlay; production renders log them */
  development: boolean;
}

/**
 * The template that failed while rendering, per error, for production log messages: Eta adds
 * the template path to messages only in its debug mode.
 */
const failingTemplates = new WeakMap<Error, string>();

/** Errors for `await` in a template that renders synchronously; such an include renders empty */
const awaitErrors = new WeakSet<Error>();

/**
 * Everything one page's render shares: the templates and lookups it records, the stack of
 * templates being rendered (for cycles), and the cache of includes rendered without props.
 */
export class RenderScope {
  readonly page: PageModel;
  readonly eta: Eta;
  readonly index: TemplateIndex;
  readonly logger: Logger;
  readonly development: boolean;
  /** The page's Markdown file, relative to the source directory */
  readonly pageFile: string;
  /** The page's folder, relative to the source directory, where looked-up names start */
  readonly pageFolder: string;
  /** Template files the page rendered, relative to the source directory, in order of first use */
  readonly templates = new Set<string>();
  /** Name lookups the page made, by folder and name */
  readonly lookups = new Map<string, TemplateLookup>();
  /** Templates rendered, counting a template each time it renders */
  renders = 0;
  /** Includes served from the page's cache instead of rendering again */
  includeCacheHits = 0;
  private readonly stack: string[] = [];
  private readonly includeCache = new Map<string, string>();

  constructor(options: RenderScopeOptions) {
    this.page = options.page;
    this.eta = options.eta;
    this.index = options.index;
    this.logger = options.logger;
    this.development = options.development;
    this.pageFile = relative(options.index.srcDir, options.page.sourcePath).replace(/\\/g, '/');
    this.pageFolder = templateFolderOf(this.pageFile);
  }

  /** Records a lookup for the page's cache entry. */
  record(lookup: TemplateLookup): void {
    this.lookups.set(`${lookup.from ?? ''}\0${lookup.name}`, lookup);
  }

  /**
   * The rendered template files as absolute POSIX paths, the given layout first.
   *
   * @param layout - The page's layout, relative to the source directory
   */
  templateFiles(layout: string | null): string[] {
    const files = [...this.templates];
    if (layout !== null && this.templates.has(layout)) {
      files.splice(files.indexOf(layout), 1);
      files.unshift(layout);
    }
    const srcDir = this.index.srcDir.replace(/\\/g, '/');
    return files.map((file) => posix.join(srcDir, file));
  }

  /** A template file for messages: its path from the project directory */
  display(file: string | null): string {
    if (file === null) {
      return 'the built-in Open Graph template';
    }
    return this.displayPath(join(this.index.srcDir, file)) || file;
  }

  /** An absolute path for messages: its path from the project directory */
  displayPath(absolutePath: string): string {
    return relative(process.cwd(), absolutePath).replace(/\\/g, '/');
  }

  /**
   * Renders a template and the parents it names with `stati.layout()`, asynchronously: the
   * page's layout and the Open Graph template, which may use `await`.
   *
   * @param base - The values of the render
   * @param template - The template file, relative to the source directory, or the source of a
   *   template without a file
   */
  async renderAsync(
    base: BaseContext,
    template: { file: string } | { source: string },
  ): Promise<string> {
    const chain: string[] = [];
    let frame: RenderFrame | null =
      'file' in template
        ? { file: template.file, props: undefined, body: NO_BODY }
        : { file: null, source: template.source, props: undefined, body: NO_BODY };
    let output = '';
    try {
      while (frame) {
        this.enter(frame.file, chain);
        const slot: LayoutSlot = { target: null, calls: 0, closed: false };
        const context = this.createContext(base, frame, slot);
        try {
          const result =
            frame.file !== null
              ? await this.eta.renderAsync(frame.file, context)
              : await this.eta.renderStringAsync(frame.source!, context);
          output = toOutput(result);
        } catch (error) {
          throw this.describeFailure(error, frame, false);
        } finally {
          slot.closed = true;
        }
        frame = slot.target
          ? { file: slot.target.file, props: slot.target.props, body: output }
          : null;
      }
    } finally {
      this.leave(chain);
    }
    return output;
  }

  /**
   * Renders a template and the parents it names with `stati.layout()`, synchronously, for
   * `stati.include()`.
   */
  private renderSync(base: BaseContext, first: RenderFrame): string {
    const chain: string[] = [];
    let frame: RenderFrame | null = first;
    let output = '';
    try {
      while (frame) {
        this.enter(frame.file, chain);
        const slot: LayoutSlot = { target: null, calls: 0, closed: false };
        const context = this.createContext(base, frame, slot);
        try {
          output = toOutput(this.eta.render(frame.file!, context));
        } catch (error) {
          throw this.describeFailure(error, frame, true);
        } finally {
          slot.closed = true;
        }
        frame = slot.target
          ? { file: slot.target.file, props: slot.target.props, body: output }
          : null;
      }
    } finally {
      this.leave(chain);
    }
    return output;
  }

  private enter(file: string | null, chain: string[]): void {
    this.renders++;
    if (file === null) {
      return;
    }
    this.templates.add(file);
    this.stack.push(file);
    chain.push(file);
  }

  private leave(chain: string[]): void {
    this.stack.splice(this.stack.length - chain.length, chain.length);
  }

  private createContext(base: BaseContext, frame: RenderFrame, slot: LayoutSlot): object {
    const context: Record<string, unknown> = {
      ...base.values,
      props: frame.props,
      include: this.createInclude(base, frame.file),
      layout: this.createLayout(slot, frame.file),
    };
    if (frame.body !== NO_BODY) {
      context.body = frame.body;
    }
    return createValidatingContextProxy(context);
  }

  private createInclude(base: BaseContext, callerFile: string | null): TemplateIncludeFunction {
    const include = ((name: unknown, props?: unknown, body?: unknown) =>
      this.include(base, callerFile, name, props, body)) as TemplateIncludeFunction;
    include.has = (name: unknown) => this.has(callerFile, name);
    return include;
  }

  private createLayout(slot: LayoutSlot, callerFile: string | null): TemplateLayoutFunction {
    const layout = ((name: unknown, props?: unknown) => {
      this.setLayout(slot, callerFile, name, props);
      return '';
    }) as TemplateLayoutFunction;
    layout.has = (name: unknown) => this.has(callerFile, name);
    return layout;
  }

  /** `stati.include.has()` and `stati.layout.has()` */
  private has(callerFile: string | null, name: unknown): boolean {
    const parsed = parseTemplateName(name, callerFile);
    if (parsed.kind === 'invalid') {
      return false;
    }
    const { file, lookup } = this.index.resolve(parsed, this.pageFolder);
    this.record(lookup);
    return file !== null;
  }

  /**
   * Resolves a name for a call, recording the lookup. Reports invalid and unknown names.
   *
   * @returns The template file, or null after reporting the problem
   */
  private resolveForCall(call: string, callerFile: string | null, name: unknown): string | null {
    const parsed = parseTemplateName(name, callerFile);
    if (parsed.kind === 'invalid') {
      this.fail('error', `${call}(${describeName(name)}): the name ${parsed.reason}.`, []);
      return null;
    }
    const { file, lookup } = this.index.resolve(parsed, this.pageFolder);
    this.record(lookup);
    if (file === null) {
      this.reportUnknown(call, name, parsed, callerFile);
    }
    return file;
  }

  private reportUnknown(
    call: string,
    name: unknown,
    parsed: Exclude<TemplateName, { kind: 'invalid' }>,
    callerFile: string | null,
  ): void {
    const suggestions = this.index.suggest(parsed, this.pageFolder, callerFile);
    const tried =
      parsed.kind === 'lookup'
        ? lookupFolders(this.pageFolder).map((folder) =>
            this.display(folder === '' ? `${parsed.name}.eta` : `${folder}/${parsed.name}.eta`),
          )
        : [this.display(`${parsed.path.slice(1)}.eta`)];
    const didYouMean =
      suggestions.length > 0
        ? ` Did you mean ${suggestions.map((suggestion) => `"${suggestion}"`).join(', ')}?`
        : '';
    this.fail(
      'error',
      `${call}(${describeName(name)}): no template at ${tried.join(' or ')}.${didYouMean}`,
      suggestions.map((suggestion) => `Did you mean "${suggestion}"?`),
    );
  }

  /** `stati.include(name, props?, body?)` */
  private include(
    base: BaseContext,
    callerFile: string | null,
    name: unknown,
    props: unknown,
    body: unknown,
  ): string {
    const file = this.resolveForCall('stati.include', callerFile, name);
    if (file === null) {
      return '';
    }
    const checkedProps = this.checkProps('stati.include', name, props);
    const checkedBody = this.checkBody(name, body);
    const cacheable = checkedProps === undefined && checkedBody === undefined;
    const cacheKey = `${base.id}\0${file}`;
    if (cacheable) {
      const cached = this.includeCache.get(cacheKey);
      if (cached !== undefined) {
        this.includeCacheHits++;
        return cached;
      }
    }

    // A template that reaches itself without props renders the same way each time, forever.
    // With props it may be a recursive component, which only the depth limit stops.
    if ((cacheable && this.stack.includes(file)) || this.stack.length >= MAX_TEMPLATE_DEPTH) {
      this.reportCycle('stati.include', file);
      return '';
    }

    let html: string;
    try {
      html = this.renderSync(base, { file, props: checkedProps, body: checkedBody });
    } catch (error) {
      if (this.development) {
        throw error;
      }
      return this.logIncludeFailure(file, error);
    }
    if (cacheable) {
      this.includeCache.set(cacheKey, html);
    }
    return html;
  }

  /** `stati.layout(name, props?)` */
  private setLayout(
    slot: LayoutSlot,
    callerFile: string | null,
    name: unknown,
    props: unknown,
  ): void {
    const caller = this.display(callerFile);
    if (slot.closed) {
      this.fail(
        'warning',
        `stati.layout(${describeName(name)}) was called after ${caller} finished rendering, so it cannot wrap it. Call stati.layout() while the template renders.`,
        [],
      );
      return;
    }
    slot.calls++;
    if (slot.calls > 1) {
      this.fail(
        'warning',
        `stati.layout(${describeName(name)}): ${caller} already called stati.layout(), and a template can name one layout. The last call is used.`,
        ['Call stati.layout() once per template; choose the name with a condition instead'],
      );
    }
    const file = this.resolveForCall('stati.layout', callerFile, name);
    if (file === null) {
      slot.target = null;
      return;
    }
    if (this.stack.includes(file)) {
      this.reportCycle('stati.layout', file);
      slot.target = null;
      return;
    }
    slot.target = { file, props: this.checkProps('stati.layout', name, props) };
  }

  private checkProps(
    call: string,
    name: unknown,
    props: unknown,
  ): Record<string, unknown> | undefined {
    if (props === undefined || props === null) {
      return undefined;
    }
    if (typeof props !== 'object' || Array.isArray(props)) {
      this.fail(
        'warning',
        `${call}(${describeName(name)}, props): props must be an object, not ${describeType(props)}. The template renders without them.`,
        [`Pass the values as an object, such as ${call}(${describeName(name)}, { value })`],
      );
      return undefined;
    }
    return props as Record<string, unknown>;
  }

  private checkBody(name: unknown, body: unknown): string | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }
    if (typeof body !== 'string') {
      this.fail(
        'warning',
        `stati.include(${describeName(name)}, props, body): body must be a string of HTML, not ${describeType(body)}. The template renders without it.`,
        ['Pass HTML as a string, such as the output of another stati.include()'],
      );
      return undefined;
    }
    return body;
  }

  private reportCycle(call: string, file: string): void {
    const chain = [...this.stack, file].map((template) => this.display(template)).join(' → ');
    const reason =
      this.stack.length >= MAX_TEMPLATE_DEPTH
        ? `templates are nested more than ${MAX_TEMPLATE_DEPTH} deep`
        : `${this.display(file)} is already rendering`;
    this.fail(
      'error',
      `${call}(): ${reason}, so the call would never finish: ${chain}. The repeated template is skipped.`,
      ['Remove the call that leads back to a template that is already rendering'],
    );
  }

  /**
   * Reports a mistake at a call: in development as an error for the overlay (Eta adds the
   * calling template and line), in production as a log message.
   */
  private fail(level: 'error' | 'warning', message: string, suggestions: string[]): void {
    if (this.development) {
      throw new TemplateUsageError(message, suggestions);
    }
    const text = `${message} (page ${this.page.url})`;
    if (level === 'error') {
      this.logger.error(text);
    } else {
      this.logger.warning(text);
    }
  }

  /**
   * Turns a failure while rendering `frame` into the error to throw: compile errors become a
   * {@link TemplateError} at the template that failed to compile, with a hint for `await` in
   * a synchronous render, and every error remembers its template for production messages.
   */
  private describeFailure(error: unknown, frame: RenderFrame, sync: boolean): Error {
    const failure = error instanceof Error ? error : new Error(String(error));
    // Eta throws EtaParseError when the template itself fails to compile. Errors from templates
    // it renders reach here wrapped (EtaRuntimeError) or already described.
    if (failure instanceof EtaParseError) {
      const described = this.describeCompileError(failure, frame, sync);
      if (frame.file !== null) failingTemplates.set(described, frame.file);
      return described;
    }
    if (frame.file !== null && !failingTemplates.has(failure)) {
      failingTemplates.set(failure, frame.file);
    }
    return failure;
  }

  private describeCompileError(failure: EtaParseError, frame: RenderFrame, sync: boolean): Error {
    const filePath = frame.file !== null ? join(this.index.srcDir, frame.file) : undefined;
    // Eta appends the whole compiled function to syntax errors; the first part is the reason
    const [reason] = failure.message.split(/\n=+\n/);
    if (sync && frame.file !== null && filePath && this.compilesAsync(filePath)) {
      const source = readTemplate(filePath);
      const line = source === null ? undefined : lineOf(source, /\bawait\b/);
      const awaitError = new TemplateError(
        `${this.display(frame.file)} uses await, but templates rendered by stati.include() render synchronously. Move the awaited work into a build hook or into data a helper prepares.`,
        filePath,
        line,
        undefined,
        undefined,
        ['Templates rendered by stati.include() cannot use await'],
      );
      awaitErrors.add(awaitError);
      return awaitError;
    }
    const parsed = parseEtaError(new Error(reason ?? failure.message), filePath);
    return new TemplateError(
      frame.file !== null ? `${this.display(frame.file)}: ${parsed.message}` : parsed.message,
      filePath,
      parsed.line,
      parsed.column,
      undefined,
      parsed.suggestions,
    );
  }

  /** Whether a template that failed to compile synchronously compiles as an async function */
  private compilesAsync(filePath: string): boolean {
    const source = readTemplate(filePath);
    if (source === null) {
      return false;
    }
    try {
      this.eta.compile(source, { async: true, filepath: filePath });
      return true;
    } catch {
      return false;
    }
  }

  private logIncludeFailure(file: string, error: unknown): string {
    const failure = error instanceof Error ? error : new Error(String(error));
    const failed = failingTemplates.get(failure) ?? file;
    const message = failure.message;
    this.logger.error(`Error rendering ${this.display(failed)} for ${this.page.url}: ${message}`);
    if (awaitErrors.has(failure)) {
      return '';
    }
    return `<!-- Error rendering ${this.display(failed)}: ${message.replace(/--/g, '- -')} -->`;
  }
}

/**
 * The template that was rendering when an error was thrown, relative to the source directory.
 * Set for errors that left {@link RenderScope.renderAsync}.
 */
export function failingTemplateOf(error: Error): string | undefined {
  return failingTemplates.get(error);
}

/** The render scope of the page being rendered, for code that the template engine calls back. */
const renderScopeStorage = new AsyncLocalStorage<RenderScope>();

/**
 * Runs a page's render inside its scope.
 */
export function runInRenderScope<T>(scope: RenderScope, render: () => Promise<T>): Promise<T> {
  return renderScopeStorage.run(scope, render);
}

/**
 * The render scope of the page being rendered, or undefined outside a render.
 */
export function getRenderScope(): RenderScope | undefined {
  return renderScopeStorage.getStore();
}

function toOutput(result: unknown): string {
  if (typeof result === 'string') return result;
  return result === undefined || result === null ? '' : String(result);
}

function describeName(name: unknown): string {
  return typeof name === 'string' ? `'${name}'` : describeType(name);
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return typeof value === 'object' ? 'an object' : `a ${typeof value}`;
}

function readTemplate(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** The 1-based line of the first match, or undefined */
function lineOf(source: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(source);
  return match ? source.slice(0, match.index).split('\n').length : undefined;
}
