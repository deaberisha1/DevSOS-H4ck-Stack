import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["tests/frontend.test.tsx"],
  outfile: "tests/.generated/frontend.test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  define: {
    "import.meta.env.DEV": "true",
    "import.meta.env.VITE_USE_MOCK": '"true"',
  },
  plugins: [
    {
      name: "css-test-modules",
      setup(build) {
        build.onLoad({ filter: /\.css$/ }, () => ({
          contents:
            "export default new Proxy({}, {get: (_, name) => String(name)});",
          loader: "js",
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./tests/setup.mjs",
    "--test",
    "tests/.generated/frontend.test.mjs",
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
