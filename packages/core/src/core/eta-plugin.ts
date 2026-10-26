/**
 * Stati's Eta plugin. Eta compiles every template with functions of its own: `include()`,
 * `includeAsync()`, `layout()`, `block()` and `blockAsync()`. They resolve names their own way,
 * skip validation and the template index, and a template reached through Eta's `layout()`
 * inherits its child's `stati`. Stati templates compose with `stati.include()` and
 * `stati.layout()`, so the plugin replaces Eta's functions in each compiled template with ones
 * that report the Stati call to use.
 * @module core/eta-plugin
 */

import type { Eta, EtaConfig } from 'eta';
import { isDevelopment } from '../env.js';
import { TemplateUsageError } from './utils/index.js';
import { getRenderScope } from './template-render.js';

type EtaPlugin = EtaConfig['plugins'][number];
type AstNode = ReturnType<NonNullable<EtaPlugin['processAST']>>[number];

/**
 * Eta's declaration of its `layout()` function. The plugin checks for it: when Eta generates
 * different code, creating the engine fails instead of templates silently getting Eta's
 * functions back.
 */
export const ETA_LAYOUT_DECLARATION =
  'function layout(path, data) {\n  __eta.layout = path;\n  __eta.layoutData = data;\n}';

/** Eta's template functions that Stati replaces, and the code that declares each one. */
const ETA_FUNCTIONS = [
  { name: 'include', declaration: 'let include = ' },
  { name: 'includeAsync', declaration: 'let includeAsync = ' },
  { name: 'layout', declaration: ETA_LAYOUT_DECLARATION },
  { name: 'block', declaration: 'function block(' },
  { name: 'blockAsync', declaration: 'async function blockAsync(' },
] as const;

/** One of Eta's template functions that Stati blocks. */
export type BlockedEtaFunction = (typeof ETA_FUNCTIONS)[number]['name'];

/**
 * Whether code starts, after any comments, with a parenthesis, a bracket or a template literal.
 * JavaScript reads such a line as the continuation of the statement before it: a call, an index
 * or a tagged template.
 */
function continuesPreviousStatement(code: string): boolean {
  let rest = code.trimStart();
  while (rest.startsWith('/*') || rest.startsWith('//')) {
    const block = rest.startsWith('/*');
    const close = block ? rest.indexOf('*/', 2) : rest.indexOf('\n');
    if (close === -1) {
      return false;
    }
    rest = rest.slice(close + (block ? 2 : 1)).trimStart();
  }
  return rest.startsWith('(') || rest.startsWith('[') || rest.startsWith('`');
}

/** Marks the start of the template's own code in the compiled function. */
const BODY_START = '/*@stati:template-body@*/';

/** Property of the engine through which compiled templates report a blocked call. */
const BLOCKED_CALL_HANDLER = '__statiBlockedEtaCall';

type BlockedCallHandler = (name: BlockedEtaFunction, args: unknown[], filepath?: string) => string;

/**
 * Creates the plugin. The replacements go at the start of the template's code rather than
 * next to Eta's declarations, because with `debug` on Eta declares `block()` inside a `try`
 * block, where a replacement made outside it would be shadowed. The template's code then runs
 * in a block of its own, so it can still declare names such as `block` or `output`, which
 * would otherwise clash with Eta's declarations.
 */
export function createStatiEtaPlugin(): EtaPlugin {
  return {
    processAST(ast) {
      const lineNo = ast.reduce<number>(
        (line, node) =>
          typeof node === 'object' && node.lineNo !== undefined ? node.lineNo : line,
        1,
      );
      const start: AstNode = { t: 'e', val: BODY_START, lineNo: 1 };
      const end: AstNode = { t: 'e', val: '}', lineNo };
      // Eta joins the tags of a template without separating them, and JavaScript only ends a
      // statement at a line break when the next line cannot continue it. A tag that starts with
      // `(`, `[` or a template literal would continue the tag before it, such as
      // `<% const tags = x %>` followed by `<% (tags || []).forEach(...) %>`. The semicolon goes
      // in front of such a tag, in every mode, so development and production compile alike. A
      // tag is therefore a statement of its own; a statement without braces, such as
      // `<% if (x) %>`, takes the next tag as its body only when that tag does not start so.
      const separated = ast.map((node) =>
        typeof node === 'object' && node.t === 'e' && continuesPreviousStatement(node.val)
          ? { ...node, val: `;${node.val}` }
          : node,
      );
      return [start, ...separated, end];
    },
    processFnString(fnString) {
      if (!fnString.includes(ETA_LAYOUT_DECLARATION) || !fnString.includes(BODY_START)) {
        throw new Error(
          "Stati could not find Eta's layout() function in a compiled template, so it cannot block Eta's own include(), layout() and block(). This Eta version is not supported; install the version @stati/core depends on.",
        );
      }
      // The names are the identifiers listed in ETA_FUNCTIONS, so they need no escaping
      const replacements = ETA_FUNCTIONS.filter(({ declaration }) => fnString.includes(declaration))
        .map(
          ({ name }) =>
            `${name} = (...__statiArgs) => this.${BLOCKED_CALL_HANDLER}('${name}', __statiArgs, options && options.filepath);`,
        )
        .join(' ');
      // With debug on, Eta marks each tag's line with `__eta.line=N` and no semicolon. The marker
      // gets one, as it always did, so it ends the statement before it for every kind of tag,
      // including those the check above leaves alone.
      return fnString
        .replace(BODY_START, `${replacements} {`)
        .replace(/__eta\.line=(\d+)\n/g, '__eta.line=$1;\n');
    },
  };
}

/**
 * Installs the handler that the replaced functions call, and compiles an empty template so
 * that an Eta version the plugin does not match fails here rather than on the first page.
 *
 * @throws {Error} When Eta's generated code lacks the declarations the plugin replaces
 */
export function installEtaPlugin(eta: Eta): void {
  (eta as unknown as Record<string, BlockedCallHandler>)[BLOCKED_CALL_HANDLER] = handleBlockedCall;
  eta.compileToString('', { async: false });
}

/**
 * The Stati call to suggest for a name passed to one of Eta's functions. It keeps Eta's
 * resolution: a name without a leading `/`, `./` or `../` is relative to the calling template.
 */
function suggestedName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'path';
  }
  let path = name.replace(/\\/g, '/');
  if (path.endsWith('.eta')) {
    path = path.slice(0, -'.eta'.length);
  }
  if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../')) {
    path = `./${path}`;
  }
  // Escaped for the single-quoted string of the suggested call
  return path.replace(/[\\']/g, '\\$&');
}

/**
 * The message for a blocked call, and the replacement to suggest.
 */
export function describeBlockedCall(
  name: BlockedEtaFunction,
  args: readonly unknown[],
): { message: string; suggestion: string } {
  const withData = args.length > 1 && args[1] !== undefined;
  const target = suggestedName(args[0]);
  switch (name) {
    case 'include':
    case 'includeAsync': {
      const suggestion = `stati.include('${target}'${withData ? ', data' : ''})`;
      const sync =
        name === 'includeAsync'
          ? '; templates rendered by stati.include() render synchronously'
          : '';
      return {
        message: `Eta's ${name}() is not available in Stati templates. Use ${suggestion} instead${sync}.`,
        suggestion: `Use ${suggestion}`,
      };
    }
    case 'layout': {
      const suggestion = `stati.layout('${target}'${withData ? ', data' : ''})`;
      return {
        message: `Eta's layout() is not available in Stati templates. Use ${suggestion} instead; the data arrives as stati.props.`,
        suggestion: `Use ${suggestion}`,
      };
    }
    case 'block':
    case 'blockAsync':
      return {
        message: `Eta's ${name}() is not available in Stati templates. Pass the content to the layout as a prop instead, such as stati.layout('base', { sidebar: html }).`,
        suggestion: 'Pass the content to the layout as a prop',
      };
  }
}

/**
 * Called by a compiled template for one of Eta's blocked functions. Development throws, so the
 * error overlay points at the call; production logs the error and the call renders nothing.
 */
function handleBlockedCall(name: BlockedEtaFunction, args: unknown[], filepath?: string): string {
  const { message, suggestion } = describeBlockedCall(name, args);
  if (isDevelopment()) {
    throw new TemplateUsageError(message, [suggestion]);
  }
  const scope = getRenderScope();
  const where = filepath ? `${scope ? scope.displayPath(filepath) : filepath}: ` : '';
  const page = scope ? ` (page ${scope.page.url})` : '';
  const text = `${where}${message}${page}`;
  if (scope) {
    scope.hadError = true;
    scope.logger.error(text);
  } else {
    console.error(text);
  }
  return '';
}
