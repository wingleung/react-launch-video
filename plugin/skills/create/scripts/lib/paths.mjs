// Paths as a storyboard writes them: forward slashes on every platform, whatever relative() returned.

/** `path` with forward slashes, so a Windows relative() result compares with what a storyboard row wrote. */
export function posix(path) {
  return path.replace(/\\/g, "/");
}

/** Whether a storyboard's `cited` path names `file`, matching whole path segments so Captions.tsx is not MyCaptions.tsx. */
export function citesFile(file, cited) {
  const have = posix(file);
  const want = posix(cited).replace(/^\.\//, "");
  return have === want || have.endsWith(`/${want}`);
}
