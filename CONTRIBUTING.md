# Contributing to pr-genie

Thanks for helping out! 🧞

## Ground rules

1. **Zero runtime dependencies.** Build the small part you need instead of
   pulling a library. Tests run on `node:test` only.
2. **Conventional Commits** (`feat:`, `fix:`, `docs:` …) — the changelog is
   generated from commit messages by [changelog-genie](https://github.com/Dukk11/changelog-genie).
3. **Security:** refs from argv are regex-validated and verified via
   `rev-parse` before use; never pass user input to a shell; network targets
   must be hardcoded literals.
4. Run `npm test` before pushing — CI runs the suite on Node 18/20/22.

## Dev setup

```console
git clone https://github.com/Dukk11/pr-genie
cd pr-genie
npm test
```

## Reporting bugs

Open an issue with the command you ran, the output, and your Node version.
