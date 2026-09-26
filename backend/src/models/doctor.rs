use serde::{Deserialize, Deserializer};

/// Doctor registration payload. Accepts both camelCase keys (current UI) and
/// the older lowercase keys, and numbers or strings for numeric fields.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorInput {
    #[serde(alias = "fullname", default)]
    pub full_name: String,
    #[serde(default)]
    pub email: String,
    #[serde(default, deserialize_with = "string_or_number")]
    pub phone: String,
    #[serde(alias = "specialization", default)]
    pub speciality: String,
    #[serde(default)]
    pub qualification: String,
    #[serde(alias = "yearsofexperience", default, deserialize_with = "string_or_number")]
    pub experience: String,
    #[serde(alias = "availabledays", default)]
    pub available_days: String,
    #[serde(alias = "availabletimings", default)]
    pub available_timings: String,
    #[serde(alias = "maxpatients", default, deserialize_with = "string_or_number")]
    pub max_patients: String,
    #[serde(alias = "profilephoto", default)]
    pub profile_photo: Option<String>,
}

fn string_or_number<'de, D: Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    Ok(match serde_json::Value::deserialize(d)? {
        serde_json::Value::String(s) => s,
        serde_json::Value::Number(n) => n.to_string(),
        _ => String::new(),
    })
}
