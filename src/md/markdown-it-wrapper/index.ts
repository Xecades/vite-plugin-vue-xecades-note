import type MarkdownIt from "markdown-it";
import { Token } from "markdown-it";
import type { RuleBlock } from "markdown-it/lib/parser_block.mjs";
import type { RuleInline } from "markdown-it/lib/parser_inline.mjs";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

/**
 * Test if potential opening or closing delimieter.
 * Assumes that there is a target [marker] at state.src[pos].
 *
 * @todo 可能开放自定义，支持多字符
 */
const isValidDelim = (state: StateInline, pos: number) => {
    let prevChar, nextChar;
    let max = state.posMax;
    let can_open = true;
    let can_close = true;

    prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
    nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

    // Check non-whitespace conditions for opening and closing, and
    // check that closing delimeter isn't followed by a number
    if (
        prevChar === 0x20 /* " " */ ||
        prevChar === 0x09 /* \t */ ||
        (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */
    ) {
        can_close = false;
    }
    if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
        can_open = false;
    }

    return {
        can_open: can_open,
        can_close: can_close,
    };
};

const inline_rule_with =
    (args: MarkdownItWrapperOptions): RuleInline =>
    (state, silent) => {
        const marker = args.marker;
        let start, match, token, res, pos;

        if (state.src[state.pos] !== marker) {
            return false;
        }

        res = isValidDelim(state, state.pos);
        if (!res.can_open) {
            if (!silent) {
                state.pending += marker;
            }
            state.pos += 1;
            return true;
        }

        // First check for and bypass all properly escaped delimieters
        // This loop will assume that the first leading backtick can not
        // be the first character in state.src, which is known since
        // we have found an opening delimieter already.
        start = state.pos + 1;
        match = start;
        while ((match = state.src.indexOf(marker, match)) !== -1) {
            // Found potential [marker], look for escapes, pos will point to
            // first non escape when complete
            pos = match - 1;
            while (state.src[pos] === "\\") {
                pos -= 1;
            }

            // Even number of escapes, potential closing delimiter found
            if ((match - pos) % 2 == 1) {
                break;
            }
            match += 1;
        }

        // No closing delimter found.  Consume [marker] and continue.
        if (match === -1) {
            if (!silent) {
                state.pending += marker;
            }
            state.pos = start;
            return true;
        }

        // Check if we have empty content, ie: [marker][marker].  Do not parse.
        if (match - start === 0) {
            if (!silent) {
                state.pending += marker + marker;
            }
            state.pos = start + 1;
            return true;
        }

        // Check for valid closing delimiter
        res = isValidDelim(state, match);
        if (!res.can_close) {
            if (!silent) {
                state.pending += marker;
            }
            state.pos = start;
            return true;
        }

        if (!silent) {
            token = state.push(args.name, args.name, 0);
            token.markup = marker;
            token.content = state.src.slice(start, match);
        }

        state.pos = match + 1;
        return true;
    };

const block_rule_with =
    (args: MarkdownItWrapperOptions): RuleBlock =>
    (state, start, end, silent) => {
        const marker = args.marker;
        const length = marker.length;

        let firstLine,
            lastLine,
            next,
            lastPos,
            found = false,
            token,
            pos = state.bMarks[start] + state.tShift[start],
            max = state.eMarks[start];

        if (pos + length > max) {
            return false;
        }
        if (state.src.slice(pos, pos + length) !== marker) {
            return false;
        }

        pos += length;
        firstLine = state.src.slice(pos, max);

        if (silent) {
            return true;
        }
        if (firstLine.trim().slice(-length) === marker) {
            // Single line expression
            firstLine = firstLine.trim().slice(0, -length);

            found = true;
        }

        for (next = start; !found; ) {
            next++;

            if (next >= end) {
                break;
            }

            pos = state.bMarks[next] + state.tShift[next];
            max = state.eMarks[next];

            if (pos < max && state.tShift[next] < state.blkIndent) {
                // non-empty line with negative indent should stop the list:
                break;
            }

            if (state.src.slice(pos, max).trim().slice(-length) === marker) {
                lastPos = state.src.slice(0, max).lastIndexOf(marker);
                lastLine = state.src.slice(pos, lastPos);
                found = true;
            }
        }

        state.line = next + 1;

        token = state.push(args.name, args.name, 0);
        token.block = true;
        token.content =
            (firstLine && firstLine.trim() ? firstLine + "\n" : "") +
            state.getLines(start + 1, next, state.tShift[start], true) +
            (lastLine && lastLine.trim() ? lastLine : "");
        token.map = [start, state.line];
        token.markup = marker;

        return true;
    };

export type MarkdownItWrapperOptions = {
    /** Type of the syntax. */
    type: "inline" | "block";

    /** Identifier. */
    name: string;

    /** Syntax marker. */
    marker: string;

    /** Parser function. */
    renderer: (token: Token, env?: any) => string;
};

/**
 * Processes syntax like <marker>text<marker>.
 *
 * @param md - MarkdownIt instance
 * @param options - Options
 */
export default (md: MarkdownIt, args: MarkdownItWrapperOptions) => {
    if (args.type === "inline") {
        // Inline syntax
        md.inline.ruler.after("escape", args.name, inline_rule_with(args));
        //
    } else if (args.type === "block") {
        // Block syntax
        md.block.ruler.after("blockquote", args.name, block_rule_with(args), {
            alt: ["paragraph", "reference", "blockquote", "list"],
        });
        //
    }

    const renderer: RenderRule = (tokens, idx, options, env, self) =>
        args.renderer(tokens[idx], env);

    md.renderer.rules[args.name] = renderer;
};
