use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PhotoEntry {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub extension: String,
    pub size_bytes: u64,
    pub modified_at: i64,
    pub sort_index: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SelectionState {
    Pending,
    Selected,
    Rejected,
    Skipped,
}

impl Default for SelectionState {
    fn default() -> Self {
        SelectionState::Pending
    }
}

impl SelectionState {
    pub fn as_str(&self) -> &'static str {
        match self {
            SelectionState::Pending => "pending",
            SelectionState::Selected => "selected",
            SelectionState::Rejected => "rejected",
            SelectionState::Skipped => "skipped",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "selected" => SelectionState::Selected,
            "rejected" => SelectionState::Rejected,
            "skipped" => SelectionState::Skipped,
            _ => SelectionState::Pending,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PhotoState {
    pub photo_id: String,
    pub selection_state: SelectionState,
    pub is_favorite: bool,
    pub decided_at: Option<i64>,
}
