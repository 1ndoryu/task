use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

struct Window {
    started_at: Instant,
    requests: u32,
}

struct LimiterState {
    entries: HashMap<String, Window>,
    last_cleanup: Instant,
}

/// Limitador de ventana fija para el proceso actual.
///
/// Es deliberadamente pequeño y sin dependencia externa. En una instalación
/// multi-réplica debe sustituirse por un límite compartido antes de escalar.
pub struct FixedWindowLimiter {
    max_requests: u32,
    window: Duration,
    state: Mutex<LimiterState>,
}

impl FixedWindowLimiter {
    #[must_use]
    pub fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            max_requests,
            window,
            state: Mutex::new(LimiterState {
                entries: HashMap::new(),
                last_cleanup: Instant::now(),
            }),
        }
    }

    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if now.duration_since(state.last_cleanup) >= self.window {
            state
                .entries
                .retain(|_, window| now.duration_since(window.started_at) < self.window);
            state.last_cleanup = now;
        }

        let window = state.entries.entry(key.to_owned()).or_insert(Window {
            started_at: now,
            requests: 0,
        });
        if now.duration_since(window.started_at) >= self.window {
            window.started_at = now;
            window.requests = 0;
        }
        if window.requests >= self.max_requests {
            return false;
        }
        window.requests += 1;
        true
    }
}

#[cfg(test)]
mod tests {
    use super::FixedWindowLimiter;
    use std::time::Duration;

    #[test]
    fn blocks_after_window_budget() {
        let limiter = FixedWindowLimiter::new(2, Duration::from_mins(1));
        assert!(limiter.check("127.0.0.1"));
        assert!(limiter.check("127.0.0.1"));
        assert!(!limiter.check("127.0.0.1"));
        assert!(limiter.check("127.0.0.2"));
    }
}
