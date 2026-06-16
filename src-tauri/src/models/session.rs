use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::photo::{PhotoEntry, PhotoState};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionFile {
    pub id: String,
    pub folder_path: String,
    pub recursive: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub current_index: i64,
    pub images: Vec<PhotoEntry>,
    pub states: HashMap<String, PhotoState>,
}
