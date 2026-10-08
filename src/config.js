// Site-wide settings. Fill these in before deploying.
// GITHUB_OWNER / GITHUB_REPO: where this repo lives on GitHub.
export const GITHUB_OWNER = "error404website";
export const GITHUB_REPO = "error404-website";

// Link used by "VIEW PROJECT" in the end credits and the footer GitHub mark.
export const GITHUB_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

// The full-album download (ARCHIVE_404.zip, ~223 MB) is too big for a git repo,
// so it lives on a GitHub Release. This URL always serves the newest release's file.
export const ARCHIVE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/ARCHIVE_404.zip`;
