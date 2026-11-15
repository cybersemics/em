use std::process::Command;

/// Runs git with the given arguments and returns its trimmed output, or None when git fails, is not installed, or
/// prints nothing.
fn git(args: &[&str]) -> Option<String> {
    let output = Command::new("git").args(args).output().ok()?;
    let text = String::from_utf8(output.stdout).ok()?;
    let text = text.trim();
    (output.status.success() && !text.is_empty()).then(|| text.to_string())
}

fn main() {
    // The short hash of the commit the app is built from, which the About box shows after the version. It is resolved
    // as vite.config.ts resolves the web build's __COMMIT_HASH__, so the two agree, and is "unknown" outside a git
    // checkout.
    let commit = git(&["rev-parse", "--short", "HEAD"]).unwrap_or_else(|| "unknown".into());
    println!("cargo:rustc-env=EM_COMMIT_HASH={commit}");

    // Cargo reruns a build script only when a file it names changes, so name the files that change with the commit:
    // HEAD, which moves on a checkout, and the branch that HEAD points to, which moves on a commit and may be packed.
    let branch = git(&["symbolic-ref", "-q", "HEAD"]);
    for name in ["HEAD", "packed-refs"].into_iter().chain(branch.as_deref()) {
        if let Some(path) = git(&["rev-parse", "--git-path", name]) {
            println!("cargo:rerun-if-changed={path}");
        }
    }

    tauri_build::build()
}
