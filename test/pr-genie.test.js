'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { parseNumstat, areaOf, groupByArea, buildTitle } = require('../src/diff');
const { buildBody, buildPR, buildOllamaPrompt } = require('../src/summarize');

test('parseNumstat reads add/del/path rows', () => {
  const raw = '10\t2\tsrc/app.js\n-\t-\tbinary.png\n3\t1\t"quoted path.js"\n';
  const files = parseNumstat(raw);
  assert.deepEqual(files, [
    { path: 'src/app.js', additions: 10, deletions: 2 },
    { path: 'binary.png', additions: 0, deletions: 0 },
    { path: 'quoted path.js', additions: 3, deletions: 1 },
  ]);
  assert.equal(parseNumstat('').length, 0);
});

test('areaOf buckets paths', () => {
  assert.equal(areaOf('src/engine.js'), 'Code');
  assert.equal(areaOf('test/engine.test.js'), 'Tests');
  assert.equal(areaOf('README.md'), 'Docs');
  assert.equal(areaOf('.github/workflows/ci.yml'), 'CI / Build');
  assert.equal(areaOf('package.json'), 'Dependencies');
  assert.equal(areaOf('config/settings.yaml'), 'Config');
});

test('groupByArea keeps a stable order and drops empty areas', () => {
  const groups = groupByArea([
    { path: 'docs/guide.md' },
    { path: 'src/a.js' },
    { path: 'test/a.test.js' },
  ]);
  assert.deepEqual(groups.map((g) => g.area), ['Code', 'Tests', 'Docs']);
});

test('buildTitle prefers the first conventional commit', () => {
  assert.equal(buildTitle(['fix(cli): null guard', 'docs: readme'], [{ path: 'x' }]), 'fix(cli): null guard');
  assert.equal(buildTitle(['feat: ship it'], []), 'feat: ship it');
});

test('buildTitle falls back to file count', () => {
  assert.equal(buildTitle(['random subject'], [{ path: 'a.js' }]), 'chore: update a.js');
  assert.equal(buildTitle([], [{ path: 'a.js' }, { path: 'b.js' }]), 'chore: update 2 files');
});

test('buildBody renders summary, stats and checklist', () => {
  const md = buildBody({
    files: [
      { path: 'src/app.js', additions: 42, deletions: 3 },
      { path: 'test/app.test.js', additions: 10, deletions: 0 },
    ],
    subjects: ['feat: add engine'],
    base: 'main',
  });
  assert.ok(md.includes('## Summary'));
  assert.ok(md.includes('**Code:** touch `src/app.js`'));
  assert.ok(md.includes('**2 files** changed, **+52 −3**'));
  assert.ok(md.includes('_base: `main`_'));
  assert.ok(md.includes('- feat: add engine'));
  assert.ok(md.includes('- [ ] Tests added/updated'));
  assert.ok(md.includes('pr-genie](https://github.com/Dukk11/pr-genie)'));
});

test('buildPR composes title and body', () => {
  const pr = buildPR({ files: [{ path: 'src/a.js', additions: 1, deletions: 0 }], subjects: ['feat: a'] });
  assert.equal(pr.title, 'feat: a');
  assert.ok(pr.body.includes('## Summary'));
});

test('buildOllamaPrompt embeds the draft verbatim', () => {
  const prompt = buildOllamaPrompt({ title: 't', body: 'BODY' });
  assert.ok(prompt.includes('Title: t'));
  assert.ok(prompt.includes('BODY'));
});
