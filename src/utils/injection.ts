import fs from "fs-extra";

/**
 * Get names of markdown components in the directory.
 *
 * @param dir - The directory where markdown components are stored
 * @returns Names of markdown components
 */
const getMarkdownComps = (dir: string): string[] => {
    const files = fs.readdirSync(dir);
    return files
        .filter((file) => file.endsWith(".vue"))
        .map((file) => file.replace(/\.vue$/, ""));
};

let injections: string[] | null = null;

/**
 * Inject import statements for markdown components.
 *
 * @param compDir - Dir where markdown components are stored
 * @returns Import statements to be injected
 */
export default (compDir: string): string => {
    if (injections === null) injections = getMarkdownComps(compDir);

    let res: string = "";

    res += 'import dayjs from "@/assets/ts/dayjs";\n';
    for (const comp of injections) {
        res += `import ${comp} from "@/components/md/${comp}.vue";\n`;
    }

    return res;
};
