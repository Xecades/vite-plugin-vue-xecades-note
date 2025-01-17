import { expect, it } from "vitest";
import { Entry } from "../src/entry";

import type { Pathname } from "../src/entry";

it("should handle url", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "/cs/ads/avl-tree"],
        ["docs/cs/index.md", "/cs"],
        ["docs/index.md", "/"],
        ["docs/404.md", "/404"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.url).toBe(expected);
    }
});

it("should handle filename", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "avl-tree"],
        ["docs/cs/index.md", "cs"],
        ["docs/index.md", ""],
        ["docs/404.md", "404"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.filename).toBe(expected);
    }
});

it("should handle backURL", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "/cs/ads"],
        ["docs/cs/index.md", "/"],
        ["docs/index.md", "/"],
        ["docs/404.md", "/"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.backUrl).toBe(expected);
    }
});

it("should handle postPathname", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "cache/posts/cs/ads/avl-tree.vue"],
        ["docs/cs/index.md", "cache/posts/cs/index.vue"],
        ["docs/index.md", "cache/posts/index.vue"],
        ["docs/404.md", "cache/posts/404.vue"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.postPathname).toBe(expected);
    }
});

it("should handle postImportPath", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "@cache/posts/cs/ads/avl-tree"],
        ["docs/cs/index.md", "@cache/posts/cs/index"],
        ["docs/index.md", "@cache/posts/index"],
        ["docs/404.md", "@cache/posts/404"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.postImportPath).toBe(expected);
    }
});

it("should handle category", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "cs"],
        ["docs/cs/index.md", "cs"],
        ["docs/index.md", ""],
        ["docs/404.md", ""],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.category).toBe(expected);
    }
});

it("should handle type", () => {
    const tests = [
        ["docs/cs/ads/avl-tree.md", "post"],
        ["docs/cs/index.md", "index"],
        ["docs/index.md", "root"],
        ["docs/404.md", "404"],
    ];

    for (const [input, expected] of tests) {
        const entry = new Entry(input as Pathname);
        expect(entry.type).toBe(expected);
    }
});
