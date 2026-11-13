import { execFileSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const remote =
  process.env.PAGES_REMOTE ||
  execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
const temporaryDirectory = await mkdtemp(join(tmpdir(), "ahaem-pages-"));

function git(args) {
  execFileSync("git", args, {
    cwd: temporaryDirectory,
    stdio: "inherit",
  });
}

try {
  await cp(dist, temporaryDirectory, { recursive: true });
  await writeFile(join(temporaryDirectory, ".nojekyll"), "");
  git(["init", "-b", "gh-pages"]);
  git(["add", "--all"]);
  execFileSync(
    "git",
    [
      "-c",
      `user.name=${process.env.PAGES_USER_NAME || "AHAEM Open Tools"}`,
      "-c",
      `user.email=${process.env.PAGES_USER_EMAIL || "weinotes@users.noreply.github.com"}`,
      "commit",
      "-S",
      "-m",
      "chore: publish GitHub Pages build",
    ],
    { cwd: temporaryDirectory, stdio: "inherit" },
  );
  git(["remote", "add", "origin", remote]);
  git(["push", "--force", "origin", "gh-pages"]);
  console.log(`Published ${dist} to gh-pages on ${remote}`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
