'use strict';

const { execFileSync } = require('node:child_process');

const DEFAULT_BASES = ['origin/main', 'origin/master', 'main', 'master'];

function git(args, fallback) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return fallback;
  }
}

/** Find the best available base ref from an allowlist of conventional names. */
function detectBase(candidates = DEFAULT_BASES) {
  for (const ref of candidates) {
    if (ref.includes('origin/')) {
      const ok = git(['rev-parse', '--verify', '--quiet', ref], '');
      if (ok) return ref;
    } else {
      const ok = git(['rev-parse', '--verify', '--quiet', `refs/heads/${ref}`], '');
      if (ok) return ref;
    }
  }
  return null;
}

/**
 * Staged-mode diff: what is currently in the index.
 */
function stagedNumstat() {
  return git(['diff', '--cached', '--numstat'], '');
}

/**
 * Branch-mode diff against a base ref (three-dot: merge-base view).
 * The ref is validated as a known git object first — argv never reaches
 * anything but a verified rev-parse + numstat argument slot.
 */
function baseNumstat(base) {
  const ref = String(base || '');
  if (!/^[\w./-]+$/.test(ref)) throw new Error(`Suspicious ref: ${ref}`);
  const verified = git(['rev-parse', '--verify', '--quiet', ref], '');
  if (!verified) throw new Error(`Unknown git ref: ${ref}`);
  return git(['diff', `${ref}...HEAD`, '--numstat'], '');
}

/** Commit subjects: staged mode → last few on HEAD; branch mode → unique to the branch. */
function commitSubjects(base) {
  if (base) {
    const ref = String(base || '');
    if (!/^[\w./-]+$/.test(ref)) throw new Error(`Suspicious ref: ${ref}`);
    return git(['log', '--pretty=format:%s', `${ref}..HEAD`], '').split('\n').filter(Boolean);
  }
  return git(['log', '--pretty=format:%s', '-n', '10'], '').split('\n').filter(Boolean);
}

module.exports = { DEFAULT_BASES, detectBase, stagedNumstat, baseNumstat, commitSubjects };
