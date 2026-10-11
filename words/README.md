# Word lists

`5.txt`, `6.txt` and `7.txt` hold the words the sandbox uses to flag arrangements that no word fits. Each is the union of:

- **ENABLE** (Enhanced North American Benchmark Lexicon), public domain.
- **SCOWL** (Spell Checker Oriented Word Lists) 2020.12.07, size 80: the English, American, British and Canadian word lists plus spelling variants 1 and 2. Copyright Kevin Atkinson and others; see `SCOWL-Copyright.txt` for the full notice and permissions.
- Two words neither list has but Wordle has used as answers: ADMIN, CYBER.

Words are uppercase, letters A–Z only; accented words are folded to plain letters (ÉTUDE → ETUDE).

Against the original 2,309 Wordle answers, this set contains all of them, and no pattern of an answer's letters is rejected.

# Answer list

`answers.csv` is the list of Wordle answer words used for letter and vowel statistics: the union of Josh Wardle's original answer list and every answer NYT has published, one row per word.

| Column | Meaning |
|---|---|
| `word` | the answer, uppercase |
| `source` | `original` (original list only, not yet played by NYT), `nyt-used` (played by NYT, not on the original list) or `both` |
| `first_used` | first date NYT's archive lists it as the answer, if any |
| `nyt_uses` | how many dates NYT has used it (NYT began reusing answers in February 2026) |

It is built from two cached sources, with provenance and fetch dates in `answers-sources.json`:

- `original-answers.txt`: the 2,315-word answer array from Wardle's game script (`main.e65ce0a5.js`, as archived by the Wayback Machine on 2022-02-03), in its original play order.
- `nyt-archive.csv`: one row per date from NYT's per-date endpoint (`nytimes.com/svc/wordle/v2/YYYY-MM-DD.json`), from puzzle 0 (2021-06-19) on, with the date each row was fetched. `nyt_id` is NYT's internal ID, not the puzzle number.

To add answers played since the last refresh:

```bash
node scripts/refresh-answers.mjs                     # fetches new dates through yesterday
node scripts/refresh-answers.mjs --through YYYY-MM-DD  # never later than today
```

The `refresh-answers.yml` workflow runs this every Monday and commits any new answers. Only dates missing from `nyt-archive.csv` are fetched. Yesterday is the default end, since today's puzzle may still be in play in your time zone. `--offline` rebuilds `answers.csv` from the cached files. `node scripts/analyze-answers.mjs` prints the letter ranking and vowel tables.
