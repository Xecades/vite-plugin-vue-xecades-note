import type { PluginOption } from "vite";

function plugin(): PluginOption {
    return {
        name: "vite-plugin-vue-xecades-note",
        apply: "build",
        enforce: "pre",

        buildStart() {
            console.log("Preprocessing files before build...");
        },
    };
}

export default plugin;
