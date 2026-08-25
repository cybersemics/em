# Issue Classifier: Terra vs Sol

A paired comparison of `gpt-5.6-terra` and `gpt-5.6-sol` as the model behind the [issue classifier](../../scripts/issue-classifier/README.md), run against a frozen prompt on 500 issues drawn blind and never read, plus the 50 the prompt had already been measured against.

**Result: there is no accuracy difference worth paying for. Keep Terra.** Over 500 fresh issues Sol is ahead by 0.6 points, with a 95% interval of −1.8 to +3.0 — tight enough to rule out the several-point gain that would justify its price. Terra is half the cost for the same accuracy.

The interesting part is not the verdict. It is that a 150-issue sample said the opposite, confidently, and was wrong.

## Why a paired comparison and not two accuracy figures

`yarn evaluate` reports accuracy. Subtracting one model's accuracy from another's does not tell you which to deploy, because two arms four points apart are equally consistent with _fixed nine, broke seven_ and with _fixed two, broke none_. The first is noise. The second is a reason to switch. Only pairing the two models on the same issues, issue by issue, separates them — and the concordant pairs, which are most of them, carry no information about which model is better and are excluded from the test rather than allowed to dilute it.

So every figure below is computed per issue. Accuracy is reported for orientation; **the flip table is the comparison**.

## What was held fixed

The prompt was frozen before any model call, at commit `30aa9cef`:

|                   |                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `instructions.md` | sha256 `09d9b322c7676779ba98e007c1a0a1db7af5721486646dcbac7af85ecb2305ab`, 18637 bytes       |
| decision path     | `buildPrompt`, `tallyVotes`, `matchMilestone`, `parseSelection`, `selectMilestone` — unchanged |
| votes             | 5, the production default                                                                   |
| reasoning effort  | unset, so each model uses its own default                                                   |
| open milestones   | 31, fetched once and shared by every arm                                                    |

Everything downstream of the model is the production path: [`compare.ts`](../../scripts/issue-classifier/src/compare.ts) calls the real `selectMilestone` with its `infer` seam pointed at a model-parameterised request, so the retry policy, the vote tally, and the lenient milestone resolution are the ones the workflow uses. **The only field that differs between the two arms is `model`.**

The order within each pair alternates by run, so that drift over the hours these runs take falls across both arms rather than into one of them. Both arms returned five valid votes on all 3300 evaluations and never declined to answer, so nothing was lost to parsing or to an invented milestone.

## The samples

**The existing blind 50** — the samples behind the 74% figure in [#5098](https://github.com/cybersemics/em/pull/5098). Drawn without being read, but since run five times with prompt changes between runs. The pull request says so plainly: a validation set, not a clean test set.

**500 fresh issues**, drawn by [`draw.ts`](../../scripts/issue-classifier/src/draw.ts) in two independent seeded draws — 150 (`terra-sol-2026-08-25`) and then 350 more (`terra-sol-2026-08-25-ext`) — from a frame of 669: every issue a human filed and milestoned, whose milestone is still open, with a non-empty body, excluding everything already drawn. **Nobody read them.** The draw script prints issue numbers and a milestone histogram and nothing else; the only thing looked at afterwards was labels and predictions.

That the 500 arrived as two draws is what makes this document worth reading, because the second draw is an accidental replication of the first.

## Results

Three runs of each model on each set. Accuracy is the per-issue consensus — the modal answer across three runs, which removes each model's own run-to-run noise.

| sample                       | n       | Terra     | Sol       | fixed / broken | McNemar p |
| ---------------------------- | ------- | --------- | --------- | -------------- | --------- |
| blind 50 (already consulted) | 50      | **76.0%** | 72.0%     | 1 / 3          | 0.63      |
| fresh draw 1                 | 150     | 70.0%     | **74.0%** | 11 / 5         | 0.21      |
| fresh draw 2                 | 350     | **73.1%** | 72.3%     | 9 / 12         | 0.66      |
| **all fresh issues**         | **500** | 72.2%     | 72.8%     | 19 / 16        | **0.74**  |

Combined: paired bootstrap **+0.6pp for Sol (95% CI −1.8 to +3.0)**. Per run the difference is +0.4, +0.2, +0.6 — the models sit on top of each other, and they do so consistently.

### The 150-issue sample was wrong, and confidently so

Draw 1 gave Sol +4.0 points on 11 fixes against 5 regressions. That is a coherent-looking story, and it dissolved: an independently drawn 350 from the same frame gave Terra +0.9 on 9 fixes against 12 regressions.

Nothing changed between the draws — same prompt, same code, same day, same population. **The first result was sampling variance that happened to look like a finding.** It was not even an unlikely outcome: at the true effect size, 150 issues yields only about 16 discordant pairs, and 16 coin flips land 11–5 or worse about one time in five.

This is the practical cost of a small evaluation set, and it is not fixed by running more passes over the same issues. Draw 1's +4.0pp was stable across all three of its runs (+3.3, +3.3, +4.0). Repetitions measure the model's own noise; only more _issues_ measure the difference between models. A comparison set has to be sized against the discordant pairs it will produce, not against its total.

## Why the consulted set disagrees with all of them

Terra leads by 4 points on the blind 50 and by 0.9 on 350 fresh issues. Pooled over all three runs:

|       | blind 50 (consulted) | 500 fresh (never consulted) |
| ----- | -------------------- | --------------------------- |
| Terra | 76.0%                | 72.3%                       |
| Sol   | 72.0%                | 72.7%                       |

Terra loses about 4 points crossing to issues nobody looked at; Sol gains 0.7. That is the shape leakage makes, and it is the shape the pull request predicted when it flagged the set as spent. The prompt was revised against feedback from those 50 issues **while Terra was the model in the loop**, so its rules were phrased, checked, and rephrased until Terra read them correctly. Part of Terra's edge there is an edge at reading a prompt fitted to it.

**A secondary finding for #5098: the honest blind accuracy is about 72%, not 74%.** Measured on 500 unread issues rather than 50, Terra scores 72.3% (95% CI 70.0–74.5). The pull request's own note that 74% should be read as "mildly optimistic" was correct, and this quantifies it. The `ISSUE_CLASSIFIER_MIN_ACCURACY` floor of 0.66 still sits below the range.

## What a model swap cannot buy

On the 120 fresh issues where both models were wrong, they named the **identical** wrong milestone 109 times — 91%. On the blind 50 it was 11 out of 11.

Two models, asked independently, converging on the same wrong answer is not a capability limit. It is the prompt or the label. **Roughly a fifth of all issues — 109 of 500 — are ones where both models agree on an answer the taxonomy says is wrong**, and no amount of model strength moves them.

That is the ceiling this classifier actually sits under, and it binds far harder than a choice between two models 0.6 points apart. The levers that reach it are prompt work and label review, and #5098 already demonstrates both: correcting six mislabeled train samples moved train accuracy ten points, and the repository conventions supplied by hand moved a semi-random set from 53% to 74%.

## Cost

Measured from token counts recorded during the runs, priced at OpenAI's published short-context rates (Terra $2/$12 per Mtok in/out, Sol $4/$20).

|       | $/issue | prompt tokens | cached | output |
| ----- | ------- | ------------- | ------ | ------ |
| Terra | $0.0067 | 4634          | 4412   | 446    |
| Sol   | $0.0132 | 4634          | 4412   | 529    |

Sol is **1.98×** Terra, or **+$6.56 per 1000 issues**. The prompt caches almost completely — 4412 of 4634 prompt tokens — so nearly all the gap is output tokens.

Against real volume the ratio is a distraction. This repository opened 370 issues in 2025 and 592 in 2026 through August; the 231 currently unmilestoned open issues would cost $1.51 more to classify on Sol. **The annual difference is under $10 either way.**

That cuts both ways, and it is worth being explicit about which. Price is not the reason to prefer Terra — at these volumes neither model costs enough to matter. Terra wins because it is _not worse_, and between two equal options the cheaper one wins by default. Had Sol shown the four points draw 1 suggested, $6.56 per thousand issues would have been an easy yes.

## Deployment

**Keep `gpt-5.6-terra`.** The measured difference is 0.6 points in Sol's favour with an interval that comfortably contains zero, on 500 issues at three runs each. Sol does repeat itself more often run to run — 96.8% of issues answered identically across all three runs against Terra's 92.4% — but that consistency does not convert into accuracy, and neither figure is large enough to decide anything.

Revisit if the prompt changes materially, since the leakage analysis above shows model and prompt are not independent. Do **not** revisit by re-running these 500 issues: they have now been used to make a decision, which is exactly what happened to the blind 50.

## Reproducing

```sh
cd scripts/issue-classifier
node src/draw.ts --count 150 --seed terra-sol-2026-08-25 --out samples-blind-2.jsonl
node src/draw.ts --count 350 --seed terra-sol-2026-08-25-ext --out samples-blind-2-ext.jsonl
node src/compare.ts --models gpt-5.6-terra,gpt-5.6-sol --runs 3 --samples samples-blind-2.jsonl --split all --out fresh.jsonl
node src/compare.ts --models gpt-5.6-terra,gpt-5.6-sol --runs 3 --samples samples-blind-2-ext.jsonl --split all --out fresh.jsonl
node src/analyze.ts --in fresh.jsonl --baseline gpt-5.6-terra
```

Each draw is reproducible from its seed alone, and `draw.ts` excludes every issue any `samples*.jsonl` beside it already holds, so the second draw cannot collide with the first. Both draws predate the classifier being deployed, so every milestone in them was assigned by a human; `draw.ts` now carries an `ASSIGNS_FROM` cutoff to keep that true once it is not. `compare.ts` records the graded outcome, the vote spread, and the token usage per (run, model, issue), so the analysis and the costing both re-run offline against a run that already happened.

The whole study cost **$33.65** in API calls across 3331 model evaluations — 3306 that count toward a figure above, and 25 discarded with the aborted pass described below.

### What this harness learned the hard way

The first attempt at the 350-issue comparison lost its third pass entirely. A network blip hit all four concurrent workers at once, the three retries spaced one and two seconds apart were exhausted within three seconds, and because rows were banked until a pass finished rather than written as they were graded, `mapConcurrent` rejected and took the whole pass with it. Only 25 issue-pairs had been graded by then, so the wasted spend was about fifty cents — but the failure mode scales with how far into a pass it strikes, and it would have cost the full pass just as readily. This is the same defect [#5098](https://github.com/cybersemics/em/pull/5098) had already found and fixed in `evaluate.ts`, reintroduced in a new file.

A failure now drops that issue from _both_ arms of that run and nothing else, rows are written as each pair completes rather than banked until the run ends, and the retry base is five seconds — an unattended hour-long run should outlast a blip that a workflow job would be right to give up on. `analyze.ts` correspondingly excludes any issue only one arm graded, names it, and flags uneven run coverage rather than failing on the hole.
