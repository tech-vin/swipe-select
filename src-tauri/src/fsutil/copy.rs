use filetime::FileTime;
use std::path::Path;

/// Byte-for-byte copy preserving mtime. Returns bytes copied.
pub fn copy_preserving_mtime(src: &Path, dst: &Path) -> Result<u64, String> {
    if let Some(parent) = dst.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {e}"))?;
    }
    let bytes = std::fs::copy(src, dst).map_err(|e| format!("copy failed: {e}"))?;
    let meta = std::fs::metadata(src).map_err(|e| format!("stat src failed: {e}"))?;
    let mtime = FileTime::from_last_modification_time(&meta);
    filetime::set_file_mtime(dst, mtime).map_err(|e| format!("set mtime failed: {e}"))?;
    Ok(bytes)
}

/// Move: try rename first, fall back to copy+delete across volumes.
pub fn move_file(src: &Path, dst: &Path) -> Result<(), String> {
    if let Some(parent) = dst.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {e}"))?;
    }
    if std::fs::rename(src, dst).is_ok() {
        return Ok(());
    }
    copy_preserving_mtime(src, dst)?;
    std::fs::remove_file(src).map_err(|e| format!("remove src after move failed: {e}"))?;
    Ok(())
}

/// Produce a non-colliding destination path by appending _1, _2, … before the extension.
pub fn resolve_dest_path(dst: &Path) -> std::path::PathBuf {
    if !dst.exists() {
        return dst.to_path_buf();
    }
    let stem = dst.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = dst.extension().and_then(|e| e.to_str()).unwrap_or("");
    let parent = dst.parent().unwrap_or(Path::new("."));
    let mut counter = 1u32;
    loop {
        let name = if ext.is_empty() {
            format!("{stem}_{counter}")
        } else {
            format!("{stem}_{counter}.{ext}")
        };
        let candidate = parent.join(name);
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}
