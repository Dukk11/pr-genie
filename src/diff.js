'use strict';

/**
 * Parse `git diff --numstat` output.
 * @param {string} raw
 * @returns {Array<{path: string, additions: number, deletions: number}>}
 */
function parseNumstat(raw) {
  return String(raw || '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [add = '0', del = '0', ...rest] = line.split('\t');
      return {
        path: rest.join('\t').replace(/^"|"$/g, ''),
        additions: add === '-' ? 0 : Number.parseInt(add, 10),
        deletions: del === '-' ? 0 : Number.parseInt(del, 10),
      };
    })
    .filter((f) => f.path !== '');
}

/**
 * Bucket a file path into a human area.
 */
function areaOf(filePath) {
  const p = String(filePath).toLowerCase();
  if (/^\.github\/workflows\//.test(p) || p.includes('jenkinsfile') || p.endsWith('.gitlab-ci.yml')) return 'CI / Build';
  if (/^(test|tests|spec|__tests__)\//.test(p) || /\.(test|spec)\.[cm]?js$/.test(p) || /_test\.(py|go|rb)$/.test(p)) return 'Tests';
  if (/\.(md|mdx|txt|rst|adoc)$/.test(p) || /^(docs?|changelog|license|readme)/.test(p)) return 'Docs';
  if (/^(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|pyproject\.toml|cargo\.toml|go\.(mod|sum))$/.test(p)) return 'Dependencies';
  if (/\.(json|ya?ml|toml|ini|env|lock)$/.test(p) || /^(config|\.)/.test(p)) return 'Config';
  return 'Code';
}

/** Aggregate files into ordered, non-empty areas. */
function groupByArea(files) {
  const order = ['Code', 'Tests', 'Docs', 'CI / Build', 'Config', 'Dependencies'];
  const groups = new Map();
  for (const f of files) {
    const area = areaOf(f.path);
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(f);
  }
  return order.filter((a) => groups.has(a)).map((a) => ({ area: a, files: groups.get(a) }));
}

/**
 * Derive a PR title from commit subjects (conventional type wins) and the diff.
 * @param {string[]} subjects
 * @param {Array<{path: string}>} files
 */
function buildTitle(subjects, files) {
  const conventional = (subjects || [])
    .map((s) => (s || '').match(/^(\w+)(\([^)]*\))?!?:\s*(.+)$/))
    .filter(Boolean);
  if (conventional.length > 0) {
    const first = conventional[0];
    const scope = first[2] ? first[2].slice(1, -1) : '';
    return scope ? `${first[1]}(${scope}): ${first[3]}` : `${first[1]}: ${first[3]}`;
  }
  const n = (files || []).length;
  if (n === 1) return `chore: update ${files[0].path.split('/').pop()}`;
  return `chore: update ${n} files`;
}

module.exports = { parseNumstat, areaOf, groupByArea, buildTitle };
