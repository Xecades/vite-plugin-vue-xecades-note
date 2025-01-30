import { Token } from "markdown-it";
import MarkdownItWrapper from "../markdown-it-wrapper";

import type MarkdownIt from "markdown-it";

/**
 * Transform `:...:` into FontAwesome components.
 *
 *  - `:flag:` => `<font-awesome-icon class="icon" icon="fa-solid fa-flag" />`
 *  - `:user.r:` => `<font-awesome-icon class="icon" icon="fa-regular fa-user" />`
 *  - `:github.b:` => `<font-awesome-icon class="icon" icon="fa-brands fa-github" />`
 *
 * @param md - MarkdownIt instance
 */
export default (md: MarkdownIt) => {
    md.use(MarkdownItWrapper, {
        type: "inline",
        name: "icon_inline",
        marker: ":",
        renderer: (token: Token) => {
            let cls = token.attrGet("class");
            let id = token.attrGet("id");
            cls = cls ? " " + cls : "";
            id = id ? ` id="${id}"` : "";

            const [icon, style] = token.content.split(".");
            const type =
                style === "r" ? "regular" : style === "b" ? "brands" : "solid";
            return `<font-awesome-icon${id} class="icon${cls}" icon="fa-${type} fa-${icon}" />`;
        },
    });
};
