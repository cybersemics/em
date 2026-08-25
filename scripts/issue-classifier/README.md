# Issue Classifier

Automatic issue classification for the `em` project. When an issue is opened, this picks the open GitHub milestone that best matches it and assigns it. Milestones here are subsystems rather than releases, so the milestone is the issue's category.

Success is silent — the assigned milestone is the whole result. The only issues left unclassified are those that match no existing milestone, where a comment asks @raineorshine for the category instead.

## Setup

Define env variables in `scripts/issue-classifier/.env`:

```
GITHUB_TOKEN=
OPENAI_API_KEY=
```

`GITHUB_TOKEN` is only needed to write. Reading milestones and issues from a public repository works without one, so `--dry` runs and `yarn evaluate` need nothing but an OpenAI key.

## Usage

```bash
cd scripts/issue-classifier
yarn issue 5092 --dry
```

Without an issue number the script falls back to `ISSUE_NUMBER` (set by a manual workflow dispatch), then to the issue in the workflow event payload. `--dry` performs the inference and prints the decision but writes nothing to GitHub.

## How the decision is made

The prompt is assembled from two halves. The system message is [`instructions.md`](instructions.md) — what each milestone means, real example issue titles from it, and the rules for choosing between them. The user message carries the **currently open** milestones, fetched from the GitHub API on every run, so a milestone created or closed today is reflected immediately with no file to update. The model may only choose a title from that list, or `null`.

Five independent samples are drawn in one request (self-consistency voting via the Chat Completions `n` parameter, which bills the input once and only multiplies the tiny output). Each vote is resolved against the open milestones — leniently, so a dropped emoji or `and` for `&` still matches, while a milestone that is not open is discarded as invalid rather than counted. The modal vote wins.

**The milestone is assigned whenever the votes name one.** There is no confidence threshold, and a tie resolves to its modal winner rather than a question — a tie is a choice between two plausible buckets, not a failure to find one.

There is no threshold because the signal one would rest on does not discriminate. **Verbalized confidence measures AUROC 0.53 on held-out samples — indistinguishable from no signal at all**, and on the blind subset it is exactly 0.50, with every output claiming the same level. Thresholding a signal that cannot rank correct predictions above wrong ones buys no accuracy; it only withholds milestones from issues already placed correctly. Vote agreement carries slightly more (0.54–0.60), and the rejection curve prices it plainly: requiring unanimity gains about 2 points of accuracy and costs 7 of coverage.

The costs here are asymmetric, and not in the intuitive direction. An unmilestoned issue drops out of every milestone view and is found by accident; a wrongly milestoned one sits visibly out of place in a list someone browses, one click from correct. A question posted to a maintainer is the expensive outcome, not the safe one — at any real frequency it recreates the manual triage this tool exists to remove.

So the only issues that get no milestone are the ones where the votes named none, which means the taxonomy has no home for the issue. That is worth a human's attention in a way that "the model was only fairly sure" never was. A run that fails inference three times, or finds no open milestones at all, comments and fails the workflow: those are broken rather than uncertain.

Inference is tunable via `ISSUE_CLASSIFIER_*` env vars (see `.env.example`): `ISSUE_CLASSIFIER_MODEL`, `ISSUE_CLASSIFIER_VOTES`, `ISSUE_CLASSIFIER_REASONING_EFFORT`, `ISSUE_CLASSIFIER_TEMPERATURE`.

## Evaluation

[`samples/`](samples) holds issues whose milestone a human already chose, plus a few where the correct answer is to ask. **The samples are never placed in the prompt** — the prompt teaches the categories through the definition table and example titles instead. Holding them out is what makes the evaluation a measurement rather than a memory test, and a unit test fails if a sample's title ever appears in the instructions.

```bash
cd scripts/issue-classifier
yarn evaluate
```

### The two halves

The corpus is split in two, and the split is the whole reason the numbers mean anything. An earlier version of this corpus was 29 samples chosen by hand; it scored 90%, while 40 later samples drawn semi-randomly from the same milestones scored 53%. The gap was not the model — it was that hand-picking selects the issues a person finds easy to classify, which are the same ones the model finds easy. Tuning a prompt against samples it was measured on repeats that mistake in a quieter way.

So `split` is recorded in every sample file, assigned by alternating over a milestone-ordered list so both halves span the taxonomy:

- **`train`** — read these errors, and revise the prompt against them.
- **`test`** — held out. Score a revised prompt here to find out whether it actually generalized.

```bash
yarn evaluate                            # train, the default
ISSUE_CLASSIFIER_EVAL_SPLIT=test yarn evaluate  # the honest number — run sparingly
ISSUE_CLASSIFIER_EVAL_SPLIT=all yarn evaluate
```

Samples move from `test` to `train` and never back. Reading a sample's errors is what makes it useful for revising the prompt and what disqualifies it from measuring the result, and that is not reversible — a sample cannot be un-read. So when the train half runs dry of new information, promote a stratified slice of the held-out half rather than reading all of it, and keep the rest untouched for the number you report.

The default is `train` on purpose. A held-out set is only meaningful while it stays unseen, and every look at it leaks a little; a default of `test` would consume it on routine runs until it measured nothing but how often it had been consulted. Quote the `test` number when reporting accuracy, and let the gap between the two tell you how much of any improvement was real.

### Scoring the confidence signal

Accuracy says how often the classifier is right. It does not say whether its confidence can tell a right answer from a wrong one, which is a different question and the one that decides whether any threshold is worth having. Every run therefore also reports **AUROC** — the probability a correct prediction outranks a wrong one, where 0.5 means the signal carries no information — and **AUARC**, the mean accuracy across every coverage level, for ranking candidate signals against each other.

Both score the milestone the votes actually named rather than whatever survived to be assigned. The two coincide while nothing withholds an assignment, and they are kept distinct so that reintroducing any threshold cannot end up measuring itself.

The accuracy-rejection curve beneath them is the artifact to act on: each row is a candidate gate setting with the coverage and accuracy it would deliver. It is evaluated only at the distinct values the score takes, because these scores are heavily tied and a curve that sliced inside a tied block would report an arbitrary ordering as though it were signal.

Declines are reported as two lines rather than one rate. A genuine no-fit means the taxonomy has a hole and the comment is doing its job; a spurious decline means the model refused when something plainly fitted, which is a prompt defect. They look identical in production, so a single blended figure would hide the second behind the first.

`ISSUE_CLASSIFIER_EVAL_JSON=path` dumps the graded rows, each carrying the agreement and confidence behind its verdict, so alternative gate thresholds can be scored against a run that already happened rather than paying for inference again.

The harness runs the exact pipeline the workflow uses over every sample and grades it strictly: the assigned milestone must equal the recorded one, and a sample the votes could not place counts as a prediction of "no milestone", because that is what production would do. It reports accuracy, precision over the assignments actually made, an outcome breakdown, the mismatches, and a calibration table — then **exits non-zero below `ISSUE_CLASSIFIER_MIN_ACCURACY`** (default 0.66, set below a blind baseline that has measured 70–76% across four runs), so a prompt edit that regresses accuracy fails rather than printing a slightly worse number nobody compares.

Run it before and after editing the instructions. It makes model calls but never writes to any issue, and it is deliberately not part of CI.

Run `yarn test` from the repository root after editing `instructions.md`. The sample-integrity tests guard it, but the Test workflow ignores `**/*.md`, so a pull request that touches only the prompt will not run them — see [Path filtering](../../docs/testing.md#path-filtering). Sample edits are `.json` and do trigger Test normally.

Adding a sample: fetch the issue, save it as `samples/issue-<number>.json`, and confirm the milestone is one a human actually assigned.

```json
{
  "input": { "title": "…", "body": "…", "labels": ["bug"] },
  "expected": "🧤 Drag & Drop",
  "split": "train",
  "source": { "type": "github", "issue": 4839 }
}
```

Put a new sample in whichever half is smaller, and prefer picking issues without first checking whether they look easy.

Use `"expected": null` for an issue that genuinely fits no milestone, which asserts that the workflow asks rather than guesses.

### Drawing a blind sample

A held-out set stops being held out once it has been consulted. When that happens the answer is not to reinterpret the old set but to draw a new one, which takes a minute:

```sh
node src/draw.ts --count 150 --seed <name> --out samples-blind-2
```

The frame is every issue a human filed and milestoned, whose milestone is still open, that has a body, and that no existing sample covers. An issue whose milestone has since been closed is excluded rather than counted as a miss: the model is only ever offered the open ones, so it could not have been right.

Selection is by seeded hash — an issue's rank is `sha256(seed:number)` — so a draw is reproducible from its seed alone, and adding an issue to the repository moves only that issue rather than reshuffling every other draw. The script prints issue numbers and a milestone histogram and nothing else; printing a title would undo the draw it just made.

Keep the new set in its own directory rather than merging it into `samples/`. Merging is the irreversible move — the samples in `samples/` have been read, and a corpus cannot be un-read back into a blind measurement.

## Comparing two models

`yarn evaluate` answers "how accurate is this?". Choosing between two models is a different question, and running the first one twice and subtracting does not answer it. Two arms four points apart are equally consistent with _fixed nine, broke seven_ and with _fixed two, broke none_ — the first is noise and the second is a reason to switch, and only a per-issue pairing tells them apart.

```sh
node src/compare.ts --models gpt-5.6-terra,gpt-5.6-sol --runs 3 --samples samples-blind-2 --split all --out results.jsonl
node src/analyze.ts --in results.jsonl --baseline gpt-5.6-terra
```

Everything downstream of the model is the production path — `buildPrompt`, `tallyVotes`, and the retry policy in `selectMilestone`, which is called with its `infer` seam pointed at a model-parameterised request. The only field that differs between arms is `model`.

Three things are held fixed, because each would otherwise leak into the difference being measured: the open milestones are fetched once, both arms see the same issues, and the order within a pair alternates by run so that drift over the minutes a run takes falls across both arms rather than into one. Repetitions matter more here than they do for a single accuracy figure: with `n=5` votes the pipeline is stochastic, and a one-run gap between two models is partly two draws from two noisy processes.

`analyze.ts` reports the flip table — how many issues each model got right that the other got wrong, and which ones — then McNemar's exact test over the discordant pairs, a paired bootstrap on the difference, per-model stability across runs, and the cost from the token counts the run recorded. **The flip table is the comparison**; the accuracy percentages above it are orientation. Note how few discordant pairs a 50-issue set produces: at this accuracy it is about four, and four is not enough to distinguish a real few-point difference from chance, which is why the comparison set is larger than the accuracy set.

### What has been measured

`gpt-5.6-terra` against `gpt-5.6-sol`, both at five votes and default reasoning effort, prompt frozen. **Sol did not beat Terra.** Full results and the reasoning behind the decision are in [`docs/agents/model-comparison.md`](../../docs/agents/model-comparison.md).

## Workflow

| Workflow                                                         | Script         | Trigger                                     | Description                                                                                        |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Issue Classifier](../../.github/workflows/issue-classifier.yml) | `src/issue.ts` | Issue opened, or manual `workflow_dispatch` | Assigns the best-matching open milestone, or comments asking for a category when it cannot decide. |

It needs the `OPENAI_API_KEY` repository secret; the `GITHUB_TOKEN` is supplied by Actions. The manual dispatch takes an `issue` number, which is also how an existing unclassified issue gets a milestone.

An issue is skipped, silently and successfully, when it already has a milestone or is really a pull request. A human's classification is never overwritten.
