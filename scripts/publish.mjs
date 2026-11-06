// Publishes every non-private package under packages/ whose version is not
// on npm yet, and tags each one it published. changesets/action reads the
// "New tag:" lines to push the tags and create the GitHub releases.
//
// `changeset publish` goes through `pnpm publish`, which does not get npm's
// trusted publishing (OIDC) to authenticate. Calling the npm CLI directly from
// each package directory does.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const packagesDir = join(root, "packages");

const isPublished = (name, version) => {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version"], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim() === version;
};

const publishable = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dir = join(packagesDir, entry.name);
    try {
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8")
      );
      return { dir, manifest };
    } catch {
      return null;
    }
  })
  .filter((pkg) => pkg && !pkg.manifest.private);

let failed = false;

for (const { dir, manifest } of publishable) {
  const { name, version } = manifest;
  if (isPublished(name, version)) {
    console.log(`${name}@${version} is already on npm, skipping`);
    continue;
  }

  console.log(`Publishing ${name}@${version}`);
  const result = spawnSync(
    "npm",
    ["publish", "--access", "public", "--provenance"],
    { cwd: dir, stdio: "inherit" }
  );
  if (result.status !== 0) {
    failed = true;
    console.error(`Failed to publish ${name}@${version}`);
    continue;
  }

  const tag = `${name}@${version}`;
  execFileSync("git", ["tag", "-a", tag, "-m", tag], { cwd: root });
  console.log(`New tag: ${tag}`);
}

if (failed) {
  process.exit(1);
}
