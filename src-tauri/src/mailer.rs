use crate::db::{now_iso, CadDb};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager, State};

const CONFIG_FILE: &str = "mailer.json";
const PASS_FILE: &str = "mailer.pass";
const MAX_PUSH_LOG: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmtpConfigView {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub from_address: String,
    pub use_starttls: bool,
    pub default_recipients: String,
    pub has_password: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SmtpConfigFile {
    host: String,
    port: u16,
    username: String,
    from_address: String,
    use_starttls: bool,
    default_recipients: String,
    #[serde(default)]
    pushes: Vec<PushRecord>,
}

impl Default for SmtpConfigFile {
    fn default() -> Self {
        Self {
            host: "smtp.gmail.com".into(),
            port: 587,
            username: String::new(),
            from_address: String::new(),
            use_starttls: true,
            default_recipients: String::new(),
            pushes: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushRecord {
    pub at: String,
    pub to: String,
    pub subject: String,
    pub commit_id: Option<String>,
    pub attachment_name: String,
}

fn config_dir() -> PathBuf {
    crate::resolve_workspace_root()
}

fn config_path() -> PathBuf {
    config_dir().join(CONFIG_FILE)
}

fn password_path() -> PathBuf {
    config_dir().join(PASS_FILE)
}

fn load_file() -> SmtpConfigFile {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
        Err(_) => SmtpConfigFile::default(),
    }
}

fn save_file(cfg: &SmtpConfigFile) -> Result<(), String> {
    let dir = config_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    write_private(&config_path(), json.as_bytes())
}

fn write_private(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = file.metadata().map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn load_password() -> String {
    fs::read_to_string(password_path())
        .map(|s| s.trim_end_matches(['\n', '\r']).to_string())
        .unwrap_or_default()
}

fn save_password(password: &str) -> Result<(), String> {
    write_private(&password_path(), password.as_bytes())
}

fn to_view(cfg: &SmtpConfigFile) -> SmtpConfigView {
    SmtpConfigView {
        host: cfg.host.clone(),
        port: cfg.port,
        username: cfg.username.clone(),
        from_address: cfg.from_address.clone(),
        use_starttls: cfg.use_starttls,
        default_recipients: cfg.default_recipients.clone(),
        has_password: !load_password().is_empty(),
    }
}

#[tauri::command]
pub fn mailer_get_config() -> Result<SmtpConfigView, String> {
    Ok(to_view(&load_file()))
}

#[tauri::command]
pub fn mailer_save_config(
    host: String,
    port: u16,
    username: String,
    from_address: String,
    use_starttls: bool,
    default_recipients: String,
    password: Option<String>,
) -> Result<SmtpConfigView, String> {
    if port == 0 {
        return Err("SMTP port must be greater than 0".into());
    }
    let mut cfg = load_file();
    cfg.host = host.trim().to_string();
    cfg.port = port;
    cfg.username = username.trim().to_string();
    cfg.from_address = from_address.trim().to_string();
    if cfg.from_address.is_empty() {
        cfg.from_address = cfg.username.clone();
    }
    cfg.use_starttls = use_starttls;
    cfg.default_recipients = default_recipients.trim().to_string();
    if cfg.host.is_empty() {
        return Err("SMTP host is required".into());
    }
    save_file(&cfg)?;
    if let Some(pass) = password {
        let trimmed = pass.trim();
        if !trimmed.is_empty() {
            save_password(trimmed)?;
        }
    }
    Ok(to_view(&cfg))
}

#[tauri::command]
pub fn mailer_list_pushes() -> Result<Vec<PushRecord>, String> {
    Ok(load_file().pushes)
}

#[tauri::command]
pub fn mailer_send(
    app: AppHandle,
    db: State<'_, CadDb>,
    to: String,
    subject: String,
    body: String,
    commit_id: Option<String>,
    attachment: Option<String>,
) -> Result<PushRecord, String> {
    let cfg = load_file();
    let password = load_password();
    if cfg.host.is_empty() || cfg.username.is_empty() || password.is_empty() {
        return Err("Configure SMTP credentials before pushing".into());
    }

    let (snapshot, ephemeral) = snapshot_workspace(&app, &db, attachment.as_deref())?;
    let from = if cfg.from_address.is_empty() {
        cfg.username.clone()
    } else {
        cfg.from_address.clone()
    };
    let security = if cfg.use_starttls { "starttls" } else { "ssl" };

    let args = vec![
        "--to".into(),
        to.clone(),
        "--subject".into(),
        subject.clone(),
        "--body".into(),
        body,
        "--attachment".into(),
        snapshot.display().to_string(),
        "--important".into(),
        "--from-addr".into(),
        from,
        "--host".into(),
        cfg.host.clone(),
        "--port".into(),
        cfg.port.to_string(),
        "--user".into(),
        cfg.username.clone(),
        "--security".into(),
        security.into(),
    ];

    let envs = vec![
        ("ARBOR_SMTP_HOST".into(), cfg.host.clone()),
        ("ARBOR_SMTP_PORT".into(), cfg.port.to_string()),
        ("ARBOR_SMTP_USER".into(), cfg.username.clone()),
        ("ARBOR_SMTP_PASS".into(), password),
        ("ARBOR_SMTP_FROM".into(), cfg.from_address.clone()),
        ("ARBOR_SMTP_SECURITY".into(), security.into()),
    ];

    let output = spawn_mailer(&app, &args, &envs);
    if ephemeral {
        let _ = fs::remove_file(&snapshot);
    }
    let output = output?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("mailer exited {}", output.status)
        };
        return Err(detail);
    }

    let record = PushRecord {
        at: now_iso(),
        to,
        subject,
        commit_id,
        attachment_name: snapshot
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(".cad_db")
            .to_string(),
    };
    let mut stored = load_file();
    stored.pushes.insert(0, record.clone());
    stored.pushes.truncate(MAX_PUSH_LOG);
    save_file(&stored)?;
    Ok(record)
}

fn snapshot_workspace(
    app: &AppHandle,
    db: &CadDb,
    explicit: Option<&str>,
) -> Result<(PathBuf, bool), String> {
    if let Some(path) = explicit.map(str::trim).filter(|s| !s.is_empty()) {
        let p = PathBuf::from(path);
        if !p.is_file() {
            return Err(format!("attachment not found: {}", p.display()));
        }
        return Ok((p, false));
    }

    let cache = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| crate::resolve_workspace_root().join("cache"));
    let dir = cache.join("mailer-snapshots");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join(format!("arbor-{}.cad_db", now_iso().replace(':', "-")));
    if dest.exists() {
        fs::remove_file(&dest).map_err(|e| e.to_string())?;
    }

    let dest_str = dest.to_string_lossy().to_string();
    match db.with_conn(|conn| {
        conn.execute("VACUUM INTO ?1", rusqlite::params![dest_str])?;
        Ok(())
    }) {
        Ok(()) => Ok((dest, true)),
        Err(_) => {
            // Fallback: copy the live file after a WAL checkpoint.
            let _ = db.with_conn(|conn| {
                let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)");
                Ok(())
            });
            fs::copy(db.path(), &dest).map_err(|e| e.to_string())?;
            Ok((dest, true))
        }
    }
}

fn spawn_mailer(
    app: &AppHandle,
    args: &[String],
    envs: &[(String, String)],
) -> Result<std::process::Output, String> {
    if let Some(sidecar) = resolve_sidecar() {
        let mut cmd = Command::new(&sidecar);
        cmd.args(args);
        apply_envs(&mut cmd, envs);
        match cmd.output() {
            Ok(out) if !should_fallback_from_sidecar(&out) => return Ok(out),
            Ok(_) | Err(_) => {}
        }
    }

    let script = resolve_mailer_script(app).ok_or_else(|| {
        "mailer.py is not bundled; rebuild Arbor to include the email sidecar".to_string()
    })?;
    let python = find_python()?;
    let mut cmd = Command::new(&python.program);
    cmd.args(&python.prefix).arg(&script).args(args);
    apply_envs(&mut cmd, envs);
    cmd.output()
        .map_err(|e| format!("failed to launch Python mailer: {e}"))
}

fn apply_envs(cmd: &mut Command, envs: &[(String, String)]) {
    for (k, v) in envs {
        cmd.env(k, v);
    }
}

fn should_fallback_from_sidecar(out: &std::process::Output) -> bool {
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stderr),
        String::from_utf8_lossy(&out.stdout)
    )
    .to_lowercase();
    combined.contains("not a valid win32")
        || combined.contains("exec format")
        || combined.contains("bad interpreter")
        || combined.contains("no such file or directory")
}

fn resolve_sidecar() -> Option<PathBuf> {
    let mut dir = std::env::current_exe().ok()?;
    dir.pop();
    let name = if cfg!(windows) { "mailer.exe" } else { "mailer" };
    let path = dir.join(name);
    if path.is_file() {
        Some(path)
    } else {
        None
    }
}

fn resolve_mailer_script(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(path) = app
        .path()
        .resolve("python/mailer.py", tauri::path::BaseDirectory::Resource)
    {
        if path.is_file() {
            return Some(path);
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("python/mailer.py");
    if dev.is_file() {
        Some(dev)
    } else {
        None
    }
}

struct Python {
    program: PathBuf,
    prefix: Vec<String>,
}

fn find_python() -> Result<Python, String> {
    let candidates: &[(&str, &[&str])] = if cfg!(windows) {
        &[("py", &["-3"]), ("python3", &[]), ("python", &[])]
    } else {
        &[
            ("python3", &[]),
            ("python", &[]),
            ("/opt/homebrew/bin/python3", &[]),
            ("/usr/local/bin/python3", &[]),
            ("/usr/bin/python3", &[]),
        ]
    };
    for (name, prefix) in candidates {
        let mut cmd = Command::new(name);
        cmd.args(*prefix).arg("-c").arg("import smtplib, email.message");
        if let Ok(out) = cmd.output() {
            if out.status.success() {
                return Ok(Python {
                    program: PathBuf::from(name),
                    prefix: prefix.iter().map(|s| (*s).to_string()).collect(),
                });
            }
        }
    }
    Err(
        "Python 3 is required to send mail. Install Python 3 (with smtplib) and retry."
            .into(),
    )
}
