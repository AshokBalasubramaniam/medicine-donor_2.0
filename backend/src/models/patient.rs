use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use mongodb::bson::DateTime;

#[derive(Debug, Serialize, Deserialize)]
pub struct Patient {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub age: i32,
    pub disease: String,
    pub hospitalname: String,
    pub medicines: Vec<String>,
    pub doctor: String,
    pub date: String,
    pub time: String,
    pub mobile: String,
    pub email: String,
    pub password: String,
    pub created_at: DateTime,
    pub gender: String,
    pub relationship: String,
    pub birthday: String,
    pub category: String,
    pub aadharno: String,
    pub panno: String,
    pub place: String,
    pub street: String,
    pub town: String,
    pub pincode: String,
    pub state: String,
     #[serde(default)] 
    pub approved: bool,
    pub image: Option<String>, 
}
