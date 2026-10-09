import type Token from "markdown-it/lib/token.mjs";

export function removeAttr(token: Token, name: string) {
    const index = token.attrIndex(name);
    if (index >= 0) token.attrs!.splice(index, 1);
}
