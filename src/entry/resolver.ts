import path from "path";
import type {
    URL,
    Filename,
    Pathname,
    PostPathname,
    PostImportPath,
    Type,
} from "./index";

export const getUrl = (pathname: Pathname): URL => {
    const res = pathname
        .replace(/^docs\//, "/")
        .replace(/\.md$/, "")
        .replace(/index$/, "");

    if (res === "/") return "/";
    else return res.replace(/\/$/, "") as URL;
};

export const getFilename = (url: URL): Filename => path.basename(url);

export const getBackUrls = (url: URL, type: Type): URL[] => {
    if (type === "root") return [];

    const parts = url.split("/");
    const res = ["/"];
    for (let i = 1; i < parts.length - 1; i++)
        res.push(parts.slice(0, i + 1).join("/"));

    return res as URL[];
};

export const getPostPathname = (pathname: Pathname): PostPathname => {
    const dist = `cache/posts`;

    let res = pathname.replace(/^.+?\//, "");
    res = res.replace(/\.md$/, ".vue");
    res = path.join(dist, res);

    return res as PostPathname;
};

export const getPostImportPath = (postPathname: PostPathname): PostImportPath =>
    ("@" + postPathname.slice(0, -4)) as PostImportPath;

export const getCategory = (url: URL, type: Type): string => {
    if (type === "root" || type === "404") {
        return "";
    } else {
        return url.split("/")[1];
    }
};

export const getType = (pathname: Pathname): Type => {
    if (pathname === "docs/404.md") {
        return "404";
    } else if (pathname === "docs/index.md") {
        return "root";
    } else if (pathname.endsWith("/index.md")) {
        return "index";
    } else {
        return "post";
    }
};
