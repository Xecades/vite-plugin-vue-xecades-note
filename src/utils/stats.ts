import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import locale_zhcn from "dayjs/locale/zh-cn.js";
import wc from "words-count";

import type { Entry } from "../entry";

// @ts-ignore This is a bug in the words-count package
const wordsCount = wc.wordsCount as typeof wc;
dayjs.extend(relativeTime);
dayjs.locale(locale_zhcn);

export const wordCount = (entries: Entry[]) =>
    entries.reduce((acc, entry) => acc + wordsCount(entry.text), 0).toString();

export const pageCount = (entries: Entry[]) => (entries.length - 1).toString();

export const lastUpdate = (entries: Entry[]) => {
    let last = entries[0].time.updated;
    for (const entry of entries) {
        if (entry.time.updated > last) last = entry.time.updated;
    }
    return dayjs(last).fromNow();
};

export const recentUpdates = (entries: Entry[]) => {
    const t = (e: Entry) => new Date(e.time.updated).getTime();
    const toHtml = (e: Entry) => {
        const icon = `<font-awesome-icon class="icon" icon="fa-solid fa-caret-right" />`;
        const fmt = "YYYY-MM-DD HH:mm:ss";
        const alt = `更新于 ${dayjs(e.time.updated).format(fmt)}`;
        return `<p> ${icon} <Anchor href="${e.url}" title="${alt}">${e.front_matter.title}</Anchor></p>`;
    };

    return (
        "\n" +
        [...entries]
            .filter((e) => e.type === "post")
            .sort((a, b) => t(b) - t(a))
            .slice(0, 3)
            .map(toHtml)
            .join("\n") +
        "\n"
    );
};
