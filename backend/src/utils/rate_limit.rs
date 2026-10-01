//! A small in-process rate limiter for the auth endpoints (login, password
//! reset), keyed by action and account identifier. Enough for a single
//! server; use a shared store (e.g. Redis) when running several instances.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

static HITS: Mutex<Option<HashMap<String, (u32, Instant)>>> = Mutex::new(None);

/// Records one attempt and returns false once `max` attempts were made in `window`.
pub fn allow(action: &str, key: &str, max: u32, window: Duration) -> bool {
    let now = Instant::now();
    let mut guard = HITS.lock().unwrap_or_else(|e| e.into_inner());
    let map = guard.get_or_insert_with(HashMap::new);
    if map.len() > 10_000 {
        map.retain(|_, (_, start)| now.duration_since(*start) < window);
    }
    let entry = map.entry(format!("{action}:{}", key.trim().to_lowercase())).or_insert((0, now));
    if now.duration_since(entry.1) >= window {
        *entry = (0, now);
    }
    entry.0 += 1;
    entry.0 <= max
}
