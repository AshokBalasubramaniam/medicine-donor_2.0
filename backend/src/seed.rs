//! Test data for local testing.
//!
//! `cargo run -- seed-test-data`  replaces any previous test data with
//!                                10 doctors, 10 patients, 10 donors and
//!                                matching donation records.
//! `cargo run -- clear-test-data` removes it again.
//!
//! Every record carries `test_seed: true`; nothing else is touched.

use anyhow::Context;
use mongodb::bson::{doc, oid::ObjectId, Bson, DateTime, Document};
use mongodb::Database;

use crate::state::get_db;
use crate::utils::password::hash_password;

pub const TEST_PASSWORD: &str = "Test@12345";
const COLLECTIONS: [&str; 4] = ["Doctors", "patients", "donors", "donations"];

const DAY_MS: i64 = 24 * 60 * 60 * 1000;

fn days_ago(days: i64) -> DateTime {
    DateTime::from_millis(DateTime::now().timestamp_millis() - days * DAY_MS)
}

async fn clear(db: &Database) -> anyhow::Result<u64> {
    let mut removed = 0;
    for name in COLLECTIONS {
        removed += db
            .collection::<Document>(name)
            .delete_many(doc! { "test_seed": true }, None)
            .await
            .with_context(|| format!("could not clear test data from {name}"))?
            .deleted_count;
    }
    Ok(removed)
}

pub async fn clear_test_data() -> anyhow::Result<()> {
    let removed = clear(&get_db().await?).await?;
    println!("Removed {removed} test records.");
    Ok(())
}

fn doctors() -> Vec<Document> {
    let rows = [
        ("Dr. Meena Raman", "Cardiologist", "MBBS, MD, DM (Cardiology)", "14", "Mon – Fri", "10:00 AM – 2:00 PM", 20),
        ("Dr. Arjun Krishnan", "General Physician", "MBBS, MD", "9", "Mon – Sat", "9:00 AM – 1:00 PM", 35),
        ("Dr. Kavitha Subramanian", "Pediatrician", "MBBS, DCH", "11", "Mon – Fri", "4:00 PM – 8:00 PM", 25),
        ("Dr. Rahul Menon", "Neurologist", "MBBS, MD, DM (Neurology)", "16", "Tue, Thu, Sat", "11:00 AM – 3:00 PM", 12),
        ("Dr. Priya Natarajan", "Oncologist", "MBBS, MD, DM (Oncology)", "12", "Mon, Wed, Fri", "10:00 AM – 4:00 PM", 15),
        ("Dr. Suresh Babu", "Surgeon", "MBBS, MS (General Surgery)", "20", "Mon – Fri", "8:00 AM – 12:00 PM", 10),
        ("Dr. Lakshmi Venkatesh", "Dermatologist", "MBBS, MD (Dermatology)", "7", "Mon – Sat", "5:00 PM – 8:00 PM", 30),
        ("Dr. Vignesh Ramasamy", "Radiologist", "MBBS, MD (Radiology)", "8", "Mon – Fri", "9:00 AM – 5:00 PM", 40),
        ("Dr. Anitha Joseph", "Psychologist", "M.Phil (Clinical Psychology)", "10", "Wed – Sun", "10:00 AM – 6:00 PM", 8),
        ("Dr. Karthik Selvam", "Cardiologist", "MBBS, MD, DM (Cardiology)", "6", "Sat, Sun", "10:00 AM – 1:00 PM", 18),
    ];
    rows.iter()
        .enumerate()
        .map(|(i, (name, spec, qual, exp, days, times, max))| {
            doc! {
                "fullName": *name,
                "email": format!("doctor{}.test@example.com", i + 1),
                "phone": format!("+9198400000{:02}", i + 1),
                "speciality": *spec,
                "qualification": *qual,
                "experience": *exp,
                "availableDays": *days,
                "availableTimings": *times,
                "maxPatients": *max,
                "profilePhoto": Bson::Null,
                "test_seed": true,
            }
        })
        .collect()
}

fn donors(hash: &str) -> Vec<Document> {
    let rows = [
        ("Ramesh Kumar", 42, "Software engineer", "Chennai"),
        ("Sangeetha Iyer", 35, "Teacher", "Coimbatore"),
        ("Mohammed Irfan", 51, "Business owner", "Madurai"),
        ("Divya Prakash", 29, "Doctor", "Bengaluru"),
        ("Senthil Nathan", 47, "Bank manager", "Tiruchirappalli"),
        ("Fathima Begum", 38, "Pharmacist", "Salem"),
        ("Gopal Krishna", 60, "Retired", "Chennai"),
        ("Nisha Thomas", 33, "Designer", "Kochi"),
        ("Balaji Srinivasan", 44, "Chartered accountant", "Vellore"),
        ("Revathi Shankar", 26, "Student", "Tirunelveli"),
    ];
    rows.iter()
        .enumerate()
        .map(|(i, (name, age, job, place))| {
            doc! {
                "name": *name,
                "age": *age,
                "employment": *job,
                "place": *place,
                "category": "",
                "birthday": "",
                "email": format!("donor{}.test@example.com", i + 1),
                "phone": format!("+9198500000{:02}", i + 1),
                "password": hash,
                "created_at": days_ago(60 - i as i64 * 3),
                "image": Bson::Null,
                "refresh_tokens": [],
                "test_seed": true,
            }
        })
        .collect()
}

struct Med(&'static str, &'static str, &'static str, &'static str, &'static str);

struct PatientSeed {
    name: &'static str,
    age: i32,
    gender: &'static str,
    disease: &'static str,
    severity: &'static str,
    hospital: &'static str,
    doctor: &'static str,
    town: &'static str,
    state: &'static str,
    cost: f64,
    meds: &'static [Med],
    /// "pending", "pending-incomplete", "approved", "rejected"
    status: &'static str,
    amount: f64,
    paid: f64,
    applied_days_ago: i64,
}

const PATIENTS: [PatientSeed; 10] = [
    PatientSeed { name: "Murugan Pillai", age: 58, gender: "Male", disease: "Type 2 Diabetes with neuropathy", severity: "Moderate", hospital: "Government General Hospital", doctor: "Dr. Arjun Krishnan", town: "Chennai", state: "Tamil Nadu", cost: 4500.0,
        meds: &[Med("Metformin", "500 mg", "1-0-1", "3 months", "180 tablets"), Med("Pregabalin", "75 mg", "0-0-1", "3 months", "90 capsules")],
        status: "pending", amount: 0.0, paid: 0.0, applied_days_ago: 2 },
    PatientSeed { name: "Selvi Rajendran", age: 34, gender: "Female", disease: "Breast cancer (stage II)", severity: "Severe", hospital: "Adyar Cancer Institute", doctor: "Dr. Priya Natarajan", town: "Chennai", state: "Tamil Nadu", cost: 38000.0,
        meds: &[Med("Tamoxifen", "20 mg", "1-0-0", "6 months", "180 tablets"), Med("Ondansetron", "8 mg", "As needed", "6 months", "60 tablets")],
        status: "pending", amount: 0.0, paid: 0.0, applied_days_ago: 4 },
    PatientSeed { name: "Arun Prakash", age: 9, gender: "Male", disease: "Childhood asthma", severity: "Mild", hospital: "Institute of Child Health", doctor: "Dr. Kavitha Subramanian", town: "Madurai", state: "Tamil Nadu", cost: 1800.0,
        meds: &[Med("Budesonide inhaler", "200 mcg", "1-0-1", "3 months", "2 inhalers")],
        status: "pending-incomplete", amount: 0.0, paid: 0.0, applied_days_ago: 1 },
    PatientSeed { name: "Lakshmi Ammal", age: 67, gender: "Female", disease: "Chronic kidney disease", severity: "Critical", hospital: "Kauvery Hospital", doctor: "Dr. Arjun Krishnan", town: "Tiruchirappalli", state: "Tamil Nadu", cost: 22000.0,
        meds: &[Med("Erythropoietin injection", "4000 IU", "Weekly", "3 months", "12 vials"), Med("Sevelamer", "800 mg", "1-1-1", "3 months", "270 tablets")],
        status: "approved", amount: 60000.0, paid: 12500.0, applied_days_ago: 20 },
    PatientSeed { name: "Karthikeyan S", age: 45, gender: "Male", disease: "Coronary artery disease", severity: "Severe", hospital: "Apollo Hospital", doctor: "Dr. Meena Raman", town: "Chennai", state: "Tamil Nadu", cost: 9500.0,
        meds: &[Med("Clopidogrel", "75 mg", "1-0-0", "6 months", "180 tablets"), Med("Atorvastatin", "40 mg", "0-0-1", "6 months", "180 tablets"), Med("Metoprolol", "25 mg", "1-0-1", "6 months", "360 tablets")],
        status: "approved", amount: 25000.0, paid: 0.0, applied_days_ago: 15 },
    PatientSeed { name: "Fathima Nasreen", age: 28, gender: "Female", disease: "Epilepsy", severity: "Moderate", hospital: "Christian Medical College", doctor: "Dr. Rahul Menon", town: "Vellore", state: "Tamil Nadu", cost: 3200.0,
        meds: &[Med("Levetiracetam", "500 mg", "1-0-1", "6 months", "360 tablets")],
        status: "approved", amount: 18000.0, paid: 9000.0, applied_days_ago: 25 },
    PatientSeed { name: "Ravi Chandran", age: 52, gender: "Male", disease: "Rheumatoid arthritis", severity: "Moderate", hospital: "PSG Hospitals", doctor: "Dr. Arjun Krishnan", town: "Coimbatore", state: "Tamil Nadu", cost: 6000.0,
        meds: &[Med("Methotrexate", "15 mg", "Weekly", "3 months", "12 tablets"), Med("Folic acid", "5 mg", "1-0-0", "3 months", "90 tablets")],
        status: "approved", amount: 15000.0, paid: 13500.0, applied_days_ago: 30 },
    PatientSeed { name: "Meenakshi Sundaram", age: 61, gender: "Female", disease: "Hypertension with heart failure", severity: "Severe", hospital: "Meenakshi Mission Hospital", doctor: "Dr. Karthik Selvam", town: "Madurai", state: "Tamil Nadu", cost: 5500.0,
        meds: &[Med("Sacubitril/Valsartan", "50 mg", "1-0-1", "3 months", "180 tablets"), Med("Furosemide", "40 mg", "1-0-0", "3 months", "90 tablets")],
        status: "approved", amount: 12000.0, paid: 12000.0, applied_days_ago: 45 },
    PatientSeed { name: "Vijay Anand", age: 39, gender: "Male", disease: "Tuberculosis", severity: "Moderate", hospital: "Government Hospital", doctor: "Dr. Arjun Krishnan", town: "Salem", state: "Tamil Nadu", cost: 0.0,
        meds: &[],
        status: "rejected", amount: 0.0, paid: 0.0, applied_days_ago: 12 },
    PatientSeed { name: "Deepa Mohan", age: 31, gender: "Female", disease: "Thalassemia", severity: "Critical", hospital: "Sri Ramachandra Hospital", doctor: "Dr. Priya Natarajan", town: "Chennai", state: "Tamil Nadu", cost: 16000.0,
        meds: &[Med("Deferasirox", "500 mg", "1-0-0", "3 months", "90 tablets"), Med("Folic acid", "5 mg", "1-0-0", "3 months", "90 tablets")],
        status: "pending", amount: 0.0, paid: 0.0, applied_days_ago: 6 },
];

fn patient_doc(i: usize, p: &PatientSeed, hash: &str) -> Document {
    let n = i + 1;
    let complete = p.status != "pending-incomplete";
    let prescription: Vec<Bson> = p
        .meds
        .iter()
        .map(|m| Bson::Document(doc! { "name": m.0, "dosage": m.1, "frequency": m.2, "duration": m.3, "quantity": m.4 }))
        .collect();
    let names: Vec<Bson> = p.meds.iter().map(|m| Bson::String(m.0.into())).collect();
    let pick = |v: &str| if complete { v.to_string() } else { String::new() };
    let blood = ["O+", "B+", "A+", "AB+", "O-"][i % 5];
    let occupation = pick(["Farmer", "Tailor", "Student", "Homemaker", "Driver"][i % 5]);
    let income = pick(["Below ₹10,000", "₹10,000 – ₹25,000"][i % 2]);

    let mut d = doc! {
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "relationship": if p.age >= 25 { "Married" } else { "Single" },
        "birthday": "",
        "category": "",
        "blood_group": blood,
        "mobile": format!("+9198600000{:02}", n),
        "email": format!("patient{}.test@example.com", n),
        "password": hash,
        "created_at": days_ago(p.applied_days_ago),
        "occupation": occupation,
        "monthly_income": income,
        "aadharno": pick(&format!("4000{:08}", 10000000 + n)),
        "panno": "",
        "place": p.town,
        "street": "",
        "address": pick(&format!("{} Main Street, Ward {}", 10 + n, n)),
        "town": p.town,
        "state": p.state,
        "pincode": pick(&format!("6000{:02}", n)),
        "emergency_name": pick("Family member"),
        "emergency_relation": pick(if p.age < 18 { "Parent" } else { "Spouse" }),
        "emergency_phone": pick(&format!("+9198700000{:02}", n)),
    };
    // Split in two: one `doc!` this large exceeds the macro recursion limit.
    d.extend(doc! {
        "disease": p.disease,
        "severity": p.severity,
        "diagnosis_date": "2026-03-15",
        "allergies": if i % 3 == 0 { "Penicillin" } else { "None" },
        "chronic_conditions": if p.age > 50 { "Hypertension" } else { "" },
        "hospitalname": p.hospital,
        "hospital_address": p.town,
        "doctor": p.doctor,
        "doctor_phone": "",
        "date": "2026-10-20",
        "time": "10:30",
        "treatment_status": "Ongoing",
        "past_surgeries": "None",
        "family_history": "",
        "medicines": names,
        "prescription": prescription,
        "approved": p.status == "approved",
        "rejected": p.status == "rejected",
        "image": Bson::Null,
        "refresh_tokens": [],
        "test_seed": true,
    });
    if p.cost > 0.0 {
        d.insert("estimated_cost", p.cost);
    }
    if p.amount > 0.0 {
        d.insert("amount", p.amount);
        d.insert("paid_amount", p.paid);
        d.insert("balance_amount", (p.amount - p.paid).max(0.0));
    }
    d
}

/// Splits each funded patient's `paid` amount across a few seeded donors.
fn donation_docs(patients: &[(ObjectId, &PatientSeed)], donors: &[(ObjectId, String)]) -> Vec<Document> {
    let mut out = vec![];
    let mut next = 0usize;
    for (pid, p) in patients {
        if p.paid <= 0.0 {
            continue;
        }
        // Up to three donors per patient, amounts summing to `paid`.
        let parts = if p.paid >= 9000.0 { 3 } else { 2 };
        let share = (p.paid as i64) / parts;
        for k in 0..parts {
            let (did, dname) = &donors[next % donors.len()];
            next += 1;
            let amount = if k == parts - 1 { p.paid as i64 - share * (parts - 1) } else { share };
            let payment_id = format!("pay_TEST{:04}{}", out.len() + 1, k);
            out.push(doc! {
                "donor_id": did,
                "patient_id": pid,
                "donor_name": dname,
                "patient_name": p.name,
                "payment_id": &payment_id,
                "amount": [amount],
                "payments": [{ "amount": amount, "payment_id": &payment_id, "paid_at": days_ago((k as i64) * 3 + 1) }],
                "test_seed": true,
            });
        }
    }
    out
}

pub async fn seed_test_data() -> anyhow::Result<()> {
    let db = get_db().await?;
    let cleared = clear(&db).await?;
    if cleared > 0 {
        println!("Replaced {cleared} existing test records.");
    }
    let hash = hash_password(TEST_PASSWORD).map_err(|e| anyhow::anyhow!("hashing failed: {e}"))?;

    db.collection::<Document>("Doctors")
        .insert_many(doctors(), None)
        .await
        .context("could not insert doctors")?;

    let donor_docs = donors(&hash);
    let donor_names: Vec<String> = donor_docs.iter().map(|d| d.get_str("name").unwrap_or("").to_string()).collect();
    let res = db.collection::<Document>("donors").insert_many(donor_docs, None).await.context("could not insert donors")?;
    let mut donor_ids: Vec<(usize, ObjectId)> =
        res.inserted_ids.iter().filter_map(|(k, v)| v.as_object_id().map(|o| (*k, o))).collect();
    donor_ids.sort_by_key(|(k, _)| *k);
    let donors: Vec<(ObjectId, String)> = donor_ids.into_iter().map(|(k, o)| (o, donor_names[k].clone())).collect();

    let patient_docs: Vec<Document> = PATIENTS.iter().enumerate().map(|(i, p)| patient_doc(i, p, &hash)).collect();
    let res = db.collection::<Document>("patients").insert_many(patient_docs, None).await.context("could not insert patients")?;
    let mut ids: Vec<(usize, ObjectId)> = res.inserted_ids.iter().filter_map(|(k, v)| v.as_object_id().map(|o| (*k, o))).collect();
    ids.sort_by_key(|(k, _)| *k);
    let patients: Vec<(ObjectId, &PatientSeed)> = ids.into_iter().map(|(k, o)| (o, &PATIENTS[k])).collect();

    let donations = donation_docs(&patients, &donors);
    let donation_count = donations.len();
    if !donations.is_empty() {
        db.collection::<Document>("donations").insert_many(donations, None).await.context("could not insert donations")?;
    }

    println!("Seeded 10 doctors, 10 donors, 10 patients and {donation_count} donations.");
    println!("Logins (password for all: {TEST_PASSWORD}):");
    println!("  patients: patient1.test@example.com … patient10.test@example.com");
    println!("  donors:   donor1.test@example.com … donor10.test@example.com");
    println!("Remove with: cargo run -- clear-test-data");
    Ok(())
}
