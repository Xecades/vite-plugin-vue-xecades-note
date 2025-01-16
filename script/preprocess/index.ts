import cache from "./cache";
import parse from "./utils/md";

import { Post } from "./utils/post";

/**
 * Run script when
 *
 *  - in development mode.      ->  npm run dev
 *  - running script directly.  ->  npm run cache
 *    (In this case, process.env.NODE_ENV === undefined.)
 */
if (process.env.NODE_ENV !== "production") {
    const posts: Post[] = await parse();

    cache.search(posts);
    cache.config(posts);
    cache.route(posts);
    cache.jsx(posts);
}
