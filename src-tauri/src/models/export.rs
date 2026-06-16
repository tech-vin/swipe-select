use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub session_id: String,
    pub categories: Vec<String>, // "selected"|"rejected"|"favorite"|"skipped"
    pub destination_root: String,
    pub mode: String,              // "copy"|"move"
    pub organize_by_category: bool,
    pub verify_hashes: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportFailure {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport {
    pub total_requested: usize,
    pub succeeded: usize,
    pub failed: Vec<ExportFailure>,
    pub missing_sources: Vec<String>,
    pub skipped_existing: Vec<String>,
    pub verified_hashes: usize,
    pub duration_ms: u64,
}
