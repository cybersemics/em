workflow "Push" {
  on = "push"
  resolves = ["ESLint"]
}

workflow "Pull Request" {
  on = "pull_request"
  resolves = ["ESLint"]
}

action "ESLint" {
  uses = "stefanoeb/eslint-action@1.0.0"
  args = "index.js src/**.js"
}