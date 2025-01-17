// Conventions for /docs

/**
 * Front matter interface for markdown files.
 */
export interface MarkdownFrontMatter {
    /** Article title */
    title: string;

    /** Whether to show comments */
    comment?: boolean;

    /** Whether to show timestamp, i.e. Creation & Modification time */
    timestamp?: boolean;
}

/**
 * Unparsed nav node.
 */
export type RawNavNode = Record<string, RawNavNode[] | string>;

/**
 * Unparsed YAML configurations.
 */
export interface RawConfig {
    /** Navigation data. */
    nav: RawNavNode[];

    /** Category icons. */
    icon: Record<string, string>;
}
