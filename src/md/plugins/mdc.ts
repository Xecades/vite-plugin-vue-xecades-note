import MarkdownItMdc from "markdown-it-mdc";
import { defaultRenderer, removeAttr, THEMES } from "../utils";

import type { MarkdownItEnv } from "../../global";
import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

type Targets = Record<string, string[]>;

/**
 * Squash boolean theme attributes to a single type attribute.
 *
 * @example `<note default="true">` => `<note type="default">`
 */
const convertToAttribute = (token: Token, targets: Targets) => {
    if (targets[token.info]) {
        let attrs = targets[token.info];

        for (let attr of attrs) {
            if (token.attrGet(attr) === "true") {
                token.attrSet("type", attr);
            }
            removeAttr(token, attr);
        }
    }
};

/**
 * Convert markdown string in attributes to Expression slot.
 *
 * @example `<fold title="**success**">` => `<fold :title="expr_0">`
 */
const convertToJsx = (
    token: Token,
    md: MarkdownIt,
    env: MarkdownItEnv,
    targets: Targets
) => {
    if (targets[token.info]) {
        let attrs = targets[token.info];

        for (let attr of attrs) {
            if (token.attrGet(attr)) {
                let code = token.attrGet(attr) || "";
                let content = md
                    .renderInline(code, { entry: env.entry, tsx: true })
                    .trim();
                let id = env.entry.expr("<>" + content + "</>");

                token.attrSet(":" + attr, id);
                removeAttr(token, attr);
            }
        }
    }
};

/**
 * Convert boolean attributes.
 *
 * @example `<fold expand="true">` => `<fold :expand="true">`
 */
const convertToBoolean = (token: Token, targets: Targets) => {
    if (targets[token.info]) {
        let attrs = targets[token.info];

        for (let attr of attrs) {
            if (token.attrGet(attr) === "true") {
                removeAttr(token, attr);
                token.attrSet(":" + attr, "true");
            }
        }
    }
};

/**
 * Convert shorthand tokens.
 */
const convertShorthand = (token: Token, env: MarkdownItEnv) => {
    if (token.tag === "Index") {
        // For <Index /> Tag, attach the `target` attribute
        if (token.attrGet("target") === null) {
            token.attrSet("target", env.entry.url);
        }
    }
};

/**
 * Transform MDC components.
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    /**
     * @name markdown-it-mdc
     * @see https://github.com/antfu/markdown-it-mdc
     */

    md.use(MarkdownItMdc, {
        syntax: { inlineSpan: false, inlineProps: false },
    });

    const originalMdcBlockOpen =
        md.renderer.rules.mdc_block_open || defaultRenderer;
    const originalMdcBlockShorthand =
        md.renderer.rules.mdc_block_shorthand || defaultRenderer;

    md.renderer.rules.mdc_block_open = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        const token = tokens[idx];

        convertToAttribute(token, { fold: THEMES, note: THEMES });
        convertToJsx(token, md, env, { fold: ["title"] });
        convertToBoolean(token, { fold: ["always", "expand"] });

        return originalMdcBlockOpen(tokens, idx, options, env, self);
    };

    md.renderer.rules.mdc_block_shorthand = (
        tokens,
        idx,
        options,
        env: MarkdownItEnv,
        self
    ) => {
        const token = tokens[idx];

        convertShorthand(token, env);

        return originalMdcBlockShorthand(tokens, idx, options, env, self);
    };
};
