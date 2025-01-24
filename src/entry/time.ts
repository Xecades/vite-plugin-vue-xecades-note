import { simpleGit } from "simple-git";

import type { SimpleGit } from "simple-git";
import type { Pathname } from ".";

/** 当 git 查询更新时间在 ignoreBefore 之前时，使用 override 变量中的值 */
const ignoreBefore = "2025-01-24T13:17:33.598Z";

/** 当 override 有创建时间记录，使用该记录而忽略 git 查询结果 */
const override = [
    {
        pathname: "docs/cs/ads/amortized-analysis.md",
        created: "2024-09-19T17:10:17+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/cs/ads/avl-tree.md",
        created: "2024-09-11T13:51:55+08:00",
        updated: "2024-09-19T17:10:17+08:00",
    },
    {
        pathname: "docs/cs/ads/b-plus-tree.md",
        created: "2024-09-19T17:10:17+08:00",
        updated: "2024-10-14T15:47:25+08:00",
    },
    {
        pathname: "docs/cs/ads/binomial-queue.md",
        created: "2024-10-14T15:47:25+08:00",
        updated: "2024-10-14T15:47:25+08:00",
    },
    {
        pathname: "docs/cs/ads/leftist-heap.md",
        created: "2024-10-14T15:47:25+08:00",
        updated: "2024-10-14T15:47:25+08:00",
    },
    {
        pathname: "docs/cs/ads/red-black-tree.md",
        created: "2024-09-19T17:10:17+08:00",
        updated: "2024-10-14T15:47:25+08:00",
    },
    {
        pathname: "docs/cs/ads/review.md",
        created: "2025-01-15T11:54:29.776Z",
        updated: "2025-01-15T11:54:29.776Z",
    },
    {
        pathname: "docs/cs/ads/skew-heap.md",
        created: "2024-10-14T15:47:25+08:00",
        updated: "2024-10-14T15:47:25+08:00",
    },
    {
        pathname: "docs/cs/ads/splay-tree.md",
        created: "2024-09-19T17:10:17+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/cs/others/c-language-cheatsheet.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-19T21:15:50+08:00",
    },
    {
        pathname: "docs/cs/others/manuals-standards.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-19T21:15:50+08:00",
    },
    {
        pathname: "docs/cs/others/mit-missing-semester.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-10-04T17:39:49+08:00",
    },
    {
        pathname: "docs/ctf/game/zjuctf2024.md",
        created: "2024-10-23T22:02:46+08:00",
        updated: "2024-10-23T22:02:46+08:00",
    },
    {
        pathname: "docs/misc/french.md",
        created: "2024-09-19T20:37:46+08:00",
        updated: "2024-10-13T23:27:21+08:00",
    },
    {
        pathname: "docs/misc/test/customToken.md",
        created: "2024-08-19T14:28:15+08:00",
        updated: "2024-10-04T17:39:49+08:00",
    },
    {
        pathname: "docs/misc/test/latex.md",
        created: "2024-08-13T22:31:41+08:00",
        updated: "2024-10-04T17:39:49+08:00",
    },
    {
        pathname: "docs/misc/test/markdown.md",
        created: "2024-08-05T22:34:17+08:00",
        updated: "2024-09-19T20:41:28+08:00",
    },
    {
        pathname: "docs/sci/la/prove-that.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/sci/la/what-is.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/sci/ma/cheatsheet.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-10-04T17:39:49+08:00",
    },
    {
        pathname: "docs/sci/ma/completeness-of-real-numbers.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/sci/ma/prove-that.md",
        created: "2024-09-19T21:15:50+08:00",
        updated: "2024-09-24T17:12:51+08:00",
    },
    {
        pathname: "docs/sci/phy/chapter-27.md",
        created: "2024-09-24T21:51:32+08:00",
        updated: "2024-10-20T17:24:44+08:00",
    },
    {
        pathname: "docs/sci/phy/chapter-28.md",
        created: "2024-10-20T17:24:44+08:00",
        updated: "2024-10-20T17:24:44+08:00",
    },
    {
        pathname: "docs/sci/phy/chapter-29-30.md",
        created: "2024-10-20T17:24:44+08:00",
        updated: "2024-10-20T17:24:44+08:00",
    },
    {
        pathname: "docs/sci/prob/chapter-1.md",
        created: "2024-10-07T21:20:56+08:00",
        updated: "2024-10-27T20:36:28+08:00",
    },
    {
        pathname: "docs/sci/prob/chapter-2.md",
        created: "2024-10-27T20:36:28+08:00",
        updated: "2024-12-07T15:08:08+08:00",
    },
    {
        pathname: "docs/sci/prob/chapter-3.md",
        created: "2024-11-21T17:19:55+08:00",
        updated: "2024-11-21T18:02:11+08:00",
    },
    {
        pathname: "docs/sci/prob/distribution.md",
        created: "2024-11-21T17:19:55+08:00",
        updated: "2024-12-07T15:02:06+08:00",
    },
];

export const timeOf = async (pathname: Pathname) => {
    const git: SimpleGit = simpleGit();
    const commits = await git.log({ file: pathname });

    if (commits.total === 0) {
        const now: string = new Date().toISOString();
        return { created: now, updated: now };
    }

    const gitCreated = commits.all.at(-1)!.date;
    const gitUpdated = commits.latest!.date;

    const cached = override.find((item) => item.pathname === pathname);
    console.log(cached);

    const created: string = cached ? cached.created : gitCreated;
    const updated: string =
        gitUpdated < ignoreBefore && cached ? cached.updated : gitUpdated;

    return { created, updated };
};
