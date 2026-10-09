import { simpleGit } from "simple-git";
import { historicalTimes } from "./historical-times.ts";
import type { Pathname } from ".";

const migrationTime = Date.parse("2025-01-24T13:17:33.598Z");

/** Git HEAD, not filesystem mtime, determines publication dates. Read afresh each build. */
export async function timeOf(pathname: Pathname, root = process.cwd()) {
    const commits = await simpleGit(root).log({ file: pathname });
    const historical = historicalTimes.find((item) => item.pathname === pathname);
    const now = new Date().toISOString();
    const created = historical?.created ?? commits.all.at(-1)?.date ?? now;
    const gitUpdated = commits.latest?.date;
    const updated =
        historical && (!gitUpdated || Date.parse(gitUpdated) < migrationTime)
            ? historical.updated
            : (gitUpdated ?? now);
    return { created, updated };
}
