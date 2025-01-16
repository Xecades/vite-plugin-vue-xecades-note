import { Post } from "../post";
import traverse from "../traverse";

/**
 * Read and parse markdown files.
 *
 * @returns Parsed reactive post objects
 */
export default async (): Promise<Post[]> => {
    const files: string[] = traverse("docs");
    const posts: Post[] = [];

    for (const pathname of files) {
        posts.push(await Post.reactive(pathname));
    }

    return posts;
};
