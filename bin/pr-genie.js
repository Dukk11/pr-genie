'use strict';

const { parseNumstat, buildTitle } = require('./diff');
const { buildPR } = require('./summarize');
const { detectBase, stagedNumstat, baseNumstat, commitSubjects } = require('./git');

const HELP = `pr-genie 🧞 — PR titles & descriptions, auto-written from your diff

Usage:
  pr-genie [options]

Modes:
  (no mode)                summarize the currently staged changes (git diff --cached)
  --base <ref>             summarize everything on HEAD not in <ref> (e.g. --base main)

Options:
  --ai [model]             polish the body with a local Ollama model (default: llama3.2)
  --title-only             print only the suggested title
  --body-only              print only the suggested body
  --version, -v            print version
  --help, -h               show this help

Pipe it straight into GitHub CLI:
  pr-genie --base main | gh pr edit 42 --body-file -
  pr-genie --staged > body.md && gh pr create --title "$(pr-genie --title-only)" --body-file body.md

Zero dependencies. Offline by default. Free forever.`;

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--help': case '-h': opts.help = true; break;
      case '--version': case '-v': opts.version = true; break;
      case '--base': opts.base = argv[++i]; break;
      case '--ai': opts.ai = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'llama3.2'; break;
      case '--title-only': opts.titleOnly = true; break;
      case '--body-only': opts.bodyOnly = true; break;
      default: throw new Error(`Unknown option: ${a}\n\n${HELP}`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(HELP); return; }
  if (opts.version) { console.log(require('../package.json').version); return; }

  const rawDiff = opts.base ? baseNumstat(opts.base) : stagedNumstat();
  const files = parseNumstat(rawDiff);
  const subjects = commitSubjects(opts.base);
  let pr = buildPR({ files, subjects, base: opts.base });

  if (opts.ai) {
    const { polishWithOllama } = require('./ai');
    pr = await polishWithOllama(pr, opts.ai);
  } else {
    pr.title = buildTitle(subjects, files);
  }

  if (opts.titleOnly) { console.log(pr.title); return; }
  if (opts.bodyOnly) { console.log(pr.body); return; }
  console.log(`<!-- suggested title: ${pr.title} -->`);
  console.log(pr.body);
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
});

module.exports = { parseArgs };
