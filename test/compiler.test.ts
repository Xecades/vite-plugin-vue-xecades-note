import { describe, expect, it } from "vitest";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { compileDocument } from "../src/compiler";

const compile = (body: string) =>
    compileDocument(`---\ntitle: Test\n---\n${body}`, "docs/test.md");
function validVue(source: string) {
    const { descriptor, errors } = parse(source, { filename: "test.vue" });
    expect(errors).toEqual([]);
    const script = compileScript(descriptor, { id: "test" });
    const result = compileTemplate({
        source: descriptor.template!.content,
        filename: "test.vue",
        id: "test",
        compilerOptions: { bindingMetadata: script.bindings },
    });
    expect(result.errors).toEqual([]);
    return result.code;
}

describe("document compiler", () => {
    it("returns self-contained TOC, search and component output in one result", () => {
        const result = compile("## **Strong** `code` $x^2$ :flag:\n\nText");
        expect(result.headings).toHaveLength(1);
        expect(result.headings[0].title).toContain(
            '<code class="inline-code">code</code>',
        );
        expect(result.headings[0].title).toContain("katex");
        expect(result.headings[0].title).toContain("<svg");
        expect(result.headings[0].title).not.toContain("expr_");
        expect(result.searchText).toContain("Strong code x^2");
        validVue(result.componentSource);
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });
    it("lowers nested Fold/Tab/Grid to explicit slots and columns", () => {
        const result = compile(
            '::tab\n# **First**\n:::fold{title="$x$ **Proof**" expand}\nNested\n:::\n# Second\n:::grid\n:sep{span=12 sm:span=24}\n\nLeft\n\n:sep{span=12}\n\nRight\n:::\n::',
        );
        expect(result.componentSource).toContain("<template #title-0>");
        expect(result.componentSource).toContain("<template #panel-1>");
        expect(result.componentSource).toContain("<template #title>");
        expect(result.componentSource).toContain('<GridColumn :start="13"');
        expect(result.componentSource).not.toContain("Delimiter");
        expect(result.searchText).toContain("Proof");
        validVue(result.componentSource);
    });
    it("keeps template delimiters and script endings literal in code", () => {
        const result = compile(
            "Text {{ notAnExpression }}\n\n`</script> {{ example }}`\n\n```html\n</script><template>{{ example }}</template>\n```",
        );
        const generated = validVue(result.componentSource);
        expect(generated).not.toContain("_ctx.notAnExpression");
        expect(generated).not.toContain("_ctx.example");
        expect(result.componentSource).not.toContain("const expr_");
    });
    it("resolves local assets into imports and preserves caption formatting", () => {
        const result = compile('![**caption**](./image.svg "quoted")');
        expect(result.dependencies).toEqual(["/docs/image.svg"]);
        expect(result.componentSource).toContain("<strong>caption</strong>");
        validVue(result.componentSource);
    });
    it("shares macros across a document including headings, and isolates documents", () => {
        const result = compile(
            "$\\newcommand{\\NoteTestMacro}{\\mathbb{R}}$\n\n## $\\NoteTestMacro$\n\n$$\\NoteTestMacro$$",
        );
        expect(result.headings[0].title).toContain("katex");
        validVue(result.componentSource);
        expect(() => compile("$\\NoteTestMacro$")).toThrow(
            "Undefined control sequence",
        );
    });
    it("does not substitute site-stat syntax inside code or an attribute", () => {
        const result = compile(
            "@PAGE_COUNT\n\n`@PAGE_COUNT`\n\n[link](https://example.com/@PAGE_COUNT)",
        );
        expect(result.componentSource.match(/<SiteStat /g)).toHaveLength(1);
        expect(result.componentSource).toContain(
            "https://example.com/@PAGE_COUNT",
        );
        validVue(result.componentSource);
    });
    it("reports Markdown filename and source line for malformed structures", () => {
        expect(() => compile("::tab\nMissing delimiter\n::")).toThrow(
            /docs\/test.md:5:.*delimiter/,
        );
        expect(() => compile("::grid\n:sep{span=25}\n\nText\n::")).toThrow(
            "Grid spans",
        );
        expect(() => compile("# Outside a tab")).toThrow("Use ##");
    });
    it("renders standalone recent updates as a block, without a paragraph wrapper", () => {
        const result = compile(
            "::fold{title=Recent expand}\n@RECENT_UPDATES\n::\n\nUpdates: @RECENT_UPDATES\n\n`@RECENT_UPDATES`",
        );
        expect(result.componentSource).toContain("<RecentUpdates block />");
        expect(result.componentSource).not.toContain("<p><RecentUpdates block");
        expect(result.componentSource).toContain(
            "<p>Updates: <RecentUpdates /></p>",
        );
        expect(result.componentSource.match(/<RecentUpdates /g)).toHaveLength(
            2,
        );
        validVue(result.componentSource);
    });
    it("keeps checkbox input/label semantics", () => {
        const result = compile("- [x] Done\n- [ ] Pending");
        expect(result.componentSource).toContain('type="checkbox"');
        validVue(result.componentSource);
    });
});
