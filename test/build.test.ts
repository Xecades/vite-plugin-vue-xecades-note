import { afterEach, expect, it } from "vitest";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { simpleGit } from "simple-git";
import { buildSite } from "../src/build";

const roots: string[] = [];
afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.remove(root)));
});

it("keeps cold/warm builds equivalent, refreshes global data, and restores missing outputs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "note-build-"));
    roots.push(root);
    await simpleGit(root).init();
    await fs.outputFile(path.join(root, "docs/config.yml"), "nav: []\nicon: {}\n");
    await fs.outputFile(
        path.join(root, "docs/index.md"),
        "---\ntitle: Home\n---\n@WORD_COUNT",
    );
    await fs.outputFile(
        path.join(root, "docs/article.md"),
        "---\ntitle: Article\n---\n## Heading\n\nFirst text",
    );
    const git = simpleGit(root);
    await git.addConfig("user.name", "Note Test");
    await git.addConfig("user.email", "test@example.invalid");
    await git.add(".").commit("fixture");
    const options = { componentDir: "src/components/md" };
    const cold = await buildSite(options, root);
    const routes = await fs.readFile(path.join(root, "cache/routes.ts"), "utf8");
    const stats = await fs.readFile(path.join(root, "cache/stats.ts"), "utf8");
    await fs.remove(path.join(root, "cache/posts/article.vue"));
    const warm = await buildSite(options, root);
    expect(warm.map((d) => d.result)).toEqual(cold.map((d) => d.result));
    expect(await fs.readFile(path.join(root, "cache/routes.ts"), "utf8")).toBe(routes);
    expect(await fs.pathExists(path.join(root, "cache/posts/article.vue"))).toBe(true);
    await fs.appendFile(
        path.join(root, "docs/article.md"),
        "\n\n## Second heading\n\nAdditional content changes site statistics",
    );
    const changed = await buildSite(options, root);
    expect(
        changed.find((d) => d.entry.pathname === "docs/article.md")!.result.headings,
    ).toHaveLength(2);
    expect(await fs.readFile(path.join(root, "cache/stats.ts"), "utf8")).not.toBe(stats);
    const validRoutes = await fs.readFile(path.join(root, "cache/routes.ts"), "utf8");
    const validArticle = await fs.readFile(
        path.join(root, "cache/posts/article.vue"),
        "utf8",
    );
    await fs.outputFile(
        path.join(root, "docs/article.md"),
        "---\ntitle: Broken\n---\n::tab\nNo delimiter\n::",
    );
    await expect(buildSite(options, root)).rejects.toThrow("delimiter");
    expect(await fs.readFile(path.join(root, "cache/routes.ts"), "utf8")).toBe(
        validRoutes,
    );
    expect(await fs.readFile(path.join(root, "cache/posts/article.vue"), "utf8")).toBe(
        validArticle,
    );
    await fs.remove(path.join(root, "docs/article.md"));
    await buildSite(options, root);
    expect(await fs.pathExists(path.join(root, "cache/posts/article.vue"))).toBe(false);
    expect(await fs.readFile(path.join(root, "cache/routes.ts"), "utf8")).not.toContain(
        '"/article"',
    );
});
