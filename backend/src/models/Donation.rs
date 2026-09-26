use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Donation {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub donor_id: String,
    pub patient_id: String,
    pub donor_name: String,
    pub patient_name: String,
    pub payment_id: String,
    pub amount: Vec<i64>,
}