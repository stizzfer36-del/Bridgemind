//! OSC 133 parser — emits semantic shell integration events.
//!
//! Sequences recognized:
//!   ESC ] 133 ; A ; ... ST   → prompt_start
//!   ESC ] 133 ; B ; ... ST   → prompt_end
//!   ESC ] 133 ; C ; ... ST   → command_start
//!   ESC ] 133 ; D ; <exit> ST → command_finished (exit code optional)
//! ST may be either BEL (0x07) or ESC \ (0x1b 0x5c).

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum BlockEvent {
    PromptStart { ts: i64 },
    PromptEnd { ts: i64 },
    CommandStart { ts: i64 },
    CommandFinished { exit_code: Option<i32>, ts: i64 },
}

#[derive(Debug)]
enum State {
    Normal,
    Esc,
    Osc { buf: Vec<u8> },
    OscEsc { buf: Vec<u8> },
}

pub struct Osc133Parser {
    state: State,
}

impl Osc133Parser {
    pub fn new() -> Self {
        Self {
            state: State::Normal,
        }
    }

    pub fn feed(&mut self, chunk: &[u8]) -> Vec<BlockEvent> {
        let mut events = Vec::new();
        for &b in chunk {
            self.step(b, &mut events);
        }
        events
    }

    fn step(&mut self, b: u8, out: &mut Vec<BlockEvent>) {
        match std::mem::replace(&mut self.state, State::Normal) {
            State::Normal => {
                if b == 0x1b {
                    self.state = State::Esc;
                } else {
                    self.state = State::Normal;
                }
            }
            State::Esc => {
                if b == b']' {
                    self.state = State::Osc { buf: Vec::new() };
                } else {
                    self.state = State::Normal;
                }
            }
            State::Osc { mut buf } => {
                if b == 0x07 {
                    // BEL terminator
                    emit_if_133(&buf, out);
                    self.state = State::Normal;
                } else if b == 0x1b {
                    self.state = State::OscEsc { buf };
                } else {
                    buf.push(b);
                    if buf.len() > 4096 {
                        // overflow — bail
                        self.state = State::Normal;
                    } else {
                        self.state = State::Osc { buf };
                    }
                }
            }
            State::OscEsc { buf } => {
                if b == b'\\' {
                    emit_if_133(&buf, out);
                    self.state = State::Normal;
                } else {
                    self.state = State::Osc { buf };
                }
            }
        }
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn emit_if_133(buf: &[u8], out: &mut Vec<BlockEvent>) {
    let s = match std::str::from_utf8(buf) {
        Ok(s) => s,
        Err(_) => return,
    };
    let mut parts = s.split(';');
    let ps = match parts.next() {
        Some(p) => p,
        None => return,
    };
    if ps != "133" {
        return;
    }
    let kind = match parts.next() {
        Some(k) => k,
        None => return,
    };
    let ts = now_ms();
    let ev = match kind {
        "A" => BlockEvent::PromptStart { ts },
        "B" => BlockEvent::PromptEnd { ts },
        "C" => BlockEvent::CommandStart { ts },
        "D" => {
            let exit = parts.next().and_then(|p| p.parse::<i32>().ok());
            BlockEvent::CommandFinished {
                exit_code: exit,
                ts,
            }
        }
        _ => return,
    };
    out.push(ev);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_prompt_start() {
        let mut p = Osc133Parser::new();
        let ev = p.feed(b"\x1b]133;A\x07");
        assert!(matches!(ev.first(), Some(BlockEvent::PromptStart { .. })));
    }

    #[test]
    fn parses_command_finished_with_exit() {
        let mut p = Osc133Parser::new();
        let ev = p.feed(b"\x1b]133;D;0\x1b\\");
        assert!(matches!(
            ev.first(),
            Some(BlockEvent::CommandFinished {
                exit_code: Some(0),
                ..
            })
        ));
    }

    #[test]
    fn ignores_other_osc() {
        let mut p = Osc133Parser::new();
        let ev = p.feed(b"\x1b]0;title\x07");
        assert!(ev.is_empty());
    }
}
