# Issue Classifier: Terra vs Sol

A paired comparison of `gpt-5.6-terra` and `gpt-5.6-sol` as the model behind the [issue classifier](../../scripts/issue-classifier/README.md), run against a frozen prompt on two sets of issues: the set the prompt had already been measured against, and 150 issues drawn fresh and never read.

**Result: Sol is ahead by about 4 points on issues nobody has looked at, and the evidence does not reach significance at this sample size.** It fixes more than it breaks, consistently, across every run. Settling it properly costs about $22 and 90 minutes of unattended runtime, which is less than the cost of continuing to argue about it.

## Why a paired comparison and not two accuracy figures

`yarn evaluate` reports accuracy. Subtracting one model's accuracy from another's does not tell you which to deploy, because two arms four points apart are equally consistent with *fixed nine, broke seven* and with *fixed two, broke none*. The first is noise. The second is a reason to switch. Only pairing the two models on the same issues, issue by issue, separates them — and the concordant pairs, which are most of them, carry no information about which model is better and are excluded from the test rather than allowed to dilute it.

So every figure below is computed per issue. Accuracy is reported for orientation; **the flip table is the comparison**.

## What was held fixed

The prompt was frozen before any model call, at commit `30aa9cef`:

| | |
|---|---|
| `instructions.md` | sha256 `09d9b322c7676779ba98e007c1a0a1db7af5721486646dcbac7af85ecb2305ab`, 18637 bytes |
| decision path | `buildPrompt`, `tallyVotes`, `matchMilestone`, `parseSelection`, `selectMilestone` — hashed and unchanged |
| votes | 5, the production default |
| reasoning effort | unset, so each model uses its own default |
| open milestones | 31, fetched once and shared by every arm |

Everything downstream of the model is the production path: [`compare.ts`](../../scripts/issue-classifier/src/compare.ts) calls the real `selectMilestone` with its `infer` seam pointed at a model-parameterised request, so the retry policy, the vote tally, and the lenient milestone resolution are the ones the workflow uses. **The only field that differs between the two arms is `model`.**

The order within each pair alternates by run, so that drift over the minutes a run takes falls across both arms rather than into one of them. Both arms returned five valid votes on all 1200 evaluations and never declined to answer, so nothing was lost to parsing or to a milestone the model invented. Three evaluations tied (Sol 2, Terra 1); a tie assigns its modal winner in production and is scored the same way here.

## The two sets

**The existing blind 50** — the samples behind the 74% figure in [#5098](https://github.com/cybersemics/em/pull/5098). These were drawn without being read, but have since been run five times with prompt changes between runs. The pull request says so plainly: it is a validation set, not a clean test set.

**150 fresh issues**, drawn by [`draw.ts`](../../scripts/issue-classifier/src/draw.ts) with seed `terra-sol-2026-08-25` from a frame of 669 — every issue a human filed and milestoned, whose milestone is still open, with a non-empty body, excluding all 144 samples already in the corpus. They span 22 of the 31 open milestones. **Nobody read them.** The draw script prints issue numbers and a milestone histogram and nothing else, and the only thing looked at afterwards was labels and predictions.

An issue whose milestone has since been closed is excluded rather than scored as a miss: the classifier is only ever offered the open milestones, so it could not have been right.

## Results

Three runs of each model on each set. Accuracy is the per-issue consensus — the modal answer across the three runs, which removes each model's own run-to-run noise.

### The existing blind 50 — Terra ahead

| | run 1 | run 2 | run 3 | consensus |
|---|---|---|---|---|
| Terra | 76.0% | 76.0% | 76.0% | **38/50 = 76%** |
| Sol | 70.0% | 72.0% | 74.0% | **36/50 = 72%** |

Paired: **1 fixed, 3 broken.** McNemar exact p = 0.63; paired bootstrap −4.0pp (95% CI −12 to +4).

### The 150 fresh issues — Sol ahead

| | run 1 | run 2 | run 3 | consensus |
|---|---|---|---|---|
| Terra | 70.7% | 71.3% | 70.0% | **105/150 = 70%** |
| Sol | 74.0% | 74.7% | 74.0% | **111/150 = 74%** |

Paired: **11 fixed, 5 broken.** McNemar exact p = 0.21; paired bootstrap +4.0pp (95% CI −0.7 to +9.3). A sign test on each issue's correct-count across the three runs agrees: Sol better on 16 issues, Terra better on 9, p = 0.23.

**The difference is stable even though it is not significant.** Per run it is +3.3, +3.3, +4.0 points — the models themselves barely move. What the p-value is limited by is not run noise but how many issues were drawn, and 150 issues produce only 16 discordant pairs.

## Why the two sets disagree

Terra loses 5 points crossing from the consulted set to the fresh one; Sol gains 2. Both figures are pooled over all three runs.

| | validation 50 (consulted) | fresh 150 (never consulted) |
|---|---|---|
| Terra | 76.0% | 70.7% |
| Sol | 72.0% | 74.2% |

That is the shape leakage makes, and it is the shape the pull request predicted when it flagged the set as consumed. The prompt was revised against feedback from those 50 issues **while Terra was the model in the loop**, so its rules were phrased, checked, and rephrased until Terra read them correctly. Terra's edge there is partly an edge at reading a prompt fitted to it, and it does not survive contact with issues nobody consulted.

This is the concrete cost of having spent the held-out set, and the reason the fresh number is the one to quote. Confidence intervals on both sets overlap heavily, so treat the reversal as evidence that the old set cannot arbitrate this question — not as proof that Sol wins.

## What Sol actually changes

Of the 11 issues it fixed, the recurring shape is Terra reaching for a milestone that records *where a bug was seen* rather than *what owns the work* — the secondary-milestone rule the prompt spends much of its length on:

| | |
|---|---|
| `🏹 Browser Selection` | 3 fixed, 0 broken — Terra answered `📱 iOS` on two of them |
| `🔧 Toolbar` | 2 fixed, 0 broken — Terra answered `🎨 Formatting` on both |
| `👆 Multiselect` | 1 fixed, 0 broken |
| `🫧 Liminal UI` | 2 fixed, 1 broken |
| `📖 Context View` | 2 fixed, 2 broken |
| `🧤 Drag & Drop` | 1 fixed, 2 broken |

So Sol is not uniformly better: it trades errors within `📖 Context View` and loses ground on `🧤 Drag & Drop`. Its gain is concentrated in the categories where the prompt draws a boundary Terra keeps crossing.

### The errors neither model can fix

On the 34 fresh issues both models got wrong, they named the **identical** wrong milestone 32 times. On the validation set it was 11 out of 11. Two different models, asked independently, converging on the same wrong answer is not a capability limit — it is the prompt or the label. On the validation set those shared errors scatter across eleven distinct milestone pairs with no dominant confusion, several of them sitting exactly on the secondary-milestone conventions.

**This bounds what any model swap can buy.** Roughly a fifth of all issues are ones where both models agree on an answer the taxonomy says is wrong, and no amount of model strength moves them. Prompt work and label review are the lever there; model choice is not.

## Cost

Measured from the token counts the runs recorded, priced at OpenAI's published short-context rates (Terra $2/$12 per Mtok in/out, Sol $4/$20).

| | $/issue | prompt tokens | cached | output |
|---|---|---|---|---|
| Terra | $0.0068 | 4613 | 4398 | 459 |
| Sol | $0.0142 | 4613 | 4398 | 580 |

Sol is **2.09×** Terra, or **+$7.40 per 1000 issues**. The prompt caches almost completely — 4398 of 4613 prompt tokens — so nearly all of the gap is output tokens.

Against this repository's actual volume, that ratio is not the number that matters:

| | volume | extra cost on Sol |
|---|---|---|
| Issues opened in 2025 | 370 | **$2.74** |
| Issues opened in 2026 so far | 592 | **$4.38** |
| The 231 currently unmilestoned open issues | 231 | **$1.71** |

**The annual cost difference between these two models is under $10.** At that scale price should not enter the decision at all; the only question worth asking is which one is more accurate.

## What would settle it

At the observed effect, 150 issues gives **24% power** to reach p < 0.05. Simulating from the observed joint distribution:

| issues | power |
|---|---|
| 150 | 24% |
| 300 | 50% |
| 500 | 76% |
| 800 | 92% |
| 1200 | 99% |

Extending the fresh set to 500 issues means drawing 350 more and running three passes of both models over them: **about $22 and 90 minutes**, entirely automated by `draw.ts` and `compare.ts`. There are 519 unused issues left in the frame, so the sample is available.

Given that the *deployment* cost difference is under $10 a year, spending $22 once to know the answer is the obviously correct trade — and it is a better use of money than either model choice.

## Reproducing

```sh
cd scripts/issue-classifier
node src/draw.ts --count 150 --seed terra-sol-2026-08-25 --out samples-blind-2
node src/compare.ts --models gpt-5.6-terra,gpt-5.6-sol --runs 3 --samples samples-blind-2 --split all --out fresh.jsonl
node src/analyze.ts --in fresh.jsonl --baseline gpt-5.6-terra
```

The draw is reproducible from its seed alone. `compare.ts` records the graded outcome, the vote spread, and the token usage per (run, model, issue), so the analysis and the costing both re-run offline against a run that already happened.
