use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    prepare_mailer_sidecar();
    tauri_build::build();
}

/// Copy `python/mailer.py` to `binaries/mailer-<target-triple>` so Tauri can
/// bundle it as `externalBin`. Unix shebang execution works as-is; Windows
/// runtime falls back to `python` if the copied file is not a PE image.
fn prepare_mailer_sidecar() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let src = manifest_dir.join("python/mailer.py");
    println!("cargo:rerun-if-changed={}", src.display());

    let target = env::var("TARGET").unwrap_or_else(|_| {
        env::var("HOST").expect("TARGET or HOST must be set for sidecar naming")
    });
    let bin_dir = manifest_dir.join("binaries");
    fs::create_dir_all(&bin_dir).expect("create src-tauri/binaries");

    let dest_name = if target.contains("windows") {
        format!("mailer-{target}.exe")
    } else {
        format!("mailer-{target}")
    };
    let dest = bin_dir.join(dest_name);
    fs::copy(&src, &dest).unwrap_or_else(|err| {
        panic!("copy mailer sidecar {} → {}: {err}", src.display(), dest.display())
    });
    make_executable(&dest);
}

fn make_executable(path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path)
            .unwrap_or_else(|err| panic!("stat {}: {err}", path.display()))
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)
            .unwrap_or_else(|err| panic!("chmod {}: {err}", path.display()));
    }
    let _ = path;
}
