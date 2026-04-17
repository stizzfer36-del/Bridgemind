use serde::{Deserialize, Serialize};

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    InReview,
    Complete,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectCreate {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub instructions: String,
    pub task_knowledge: Option<String>,
    pub status: TaskStatus,
    pub role: Option<String>,
    pub run_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreate {
    pub project_id: String,
    pub instructions: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_knowledge: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<TaskStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskPatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_knowledge: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<TaskStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub system_prompt: String,
    pub model: String,
    pub cli_binary: String,
    pub cli_args: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCreate {
    pub project_id: String,
    pub name: String,
    pub system_prompt: String,
    pub model: String,
    pub cli_binary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cli_args: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentPatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cli_binary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cli_args: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    pub id: String,
    pub name: String,
    pub agent_id: String,
    pub pane_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Swarm {
    pub id: String,
    pub project_id: String,
    pub goal: String,
    pub status: String,
    pub roles: Vec<Role>,
    pub mailbox_id: String,
    pub mailbox: Option<Vec<Message>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwarmCreate {
    pub project_id: String,
    pub goal: String,
    pub roles: Vec<Role>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub swarm_id: String,
    pub from_agent_id: String,
    pub to_agent_id: Option<String>,
    pub body: String,
    pub sig: String,
    pub ts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageCreate {
    pub from: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<String>,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTrace {
    pub id: String,
    pub task_id: String,
    pub events: Vec<serde_json::Value>,
}

// ── Error ─────────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum ForgeError {
    Http(reqwest::StatusCode, String),
    Network(reqwest::Error),
    Json(serde_json::Error),
}

impl std::fmt::Display for ForgeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Http(status, body) => write!(f, "HTTP {status}: {body}"),
            Self::Network(e) => write!(f, "network error: {e}"),
            Self::Json(e) => write!(f, "json error: {e}"),
        }
    }
}

impl std::error::Error for ForgeError {}

impl From<reqwest::Error> for ForgeError {
    fn from(e: reqwest::Error) -> Self {
        Self::Network(e)
    }
}

// ── Client ────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct ForgeClient {
    base: String,
    token: Option<String>,
    http: reqwest::Client,
}

impl ForgeClient {
    pub fn new(base: impl Into<String>, token: impl Into<Option<String>>) -> Self {
        Self {
            base: base.into().trim_end_matches('/').to_owned(),
            token: token.into(),
            http: reqwest::Client::new(),
        }
    }

    fn auth(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        if let Some(t) = &self.token {
            req.bearer_auth(t)
        } else {
            req
        }
    }

    async fn get<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T, ForgeError> {
        let res = self.auth(self.http.get(format!("{}{}", self.base, path))).send().await?;
        let status = res.status();
        if !status.is_success() {
            return Err(ForgeError::Http(status, res.text().await.unwrap_or_default()));
        }
        res.json::<T>().await.map_err(ForgeError::Network)
    }

    async fn post<B: Serialize, T: serde::de::DeserializeOwned>(
        &self, path: &str, body: &B,
    ) -> Result<T, ForgeError> {
        let res = self.auth(self.http.post(format!("{}{}", self.base, path))).json(body).send().await?;
        let status = res.status();
        if !status.is_success() {
            return Err(ForgeError::Http(status, res.text().await.unwrap_or_default()));
        }
        res.json::<T>().await.map_err(ForgeError::Network)
    }

    async fn patch<B: Serialize, T: serde::de::DeserializeOwned>(
        &self, path: &str, body: &B,
    ) -> Result<T, ForgeError> {
        let res = self.auth(self.http.patch(format!("{}{}", self.base, path))).json(body).send().await?;
        let status = res.status();
        if !status.is_success() {
            return Err(ForgeError::Http(status, res.text().await.unwrap_or_default()));
        }
        res.json::<T>().await.map_err(ForgeError::Network)
    }

    async fn delete(&self, path: &str) -> Result<(), ForgeError> {
        let res = self.auth(self.http.delete(format!("{}{}", self.base, path))).send().await?;
        let status = res.status();
        if !status.is_success() {
            return Err(ForgeError::Http(status, res.text().await.unwrap_or_default()));
        }
        Ok(())
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    pub async fn list_projects(&self) -> Result<Vec<Project>, ForgeError> {
        self.get("/v1/projects").await
    }
    pub async fn create_project(&self, input: &ProjectCreate) -> Result<Project, ForgeError> {
        self.post("/v1/projects", input).await
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────
    pub async fn list_tasks(&self, project_id: &str) -> Result<Vec<Task>, ForgeError> {
        self.get(&format!("/v1/projects/{project_id}/tasks")).await
    }
    pub async fn create_task(&self, input: &TaskCreate) -> Result<Task, ForgeError> {
        self.post("/v1/tasks", input).await
    }
    pub async fn get_task(&self, id: &str) -> Result<Task, ForgeError> {
        self.get(&format!("/v1/tasks/{id}")).await
    }
    pub async fn update_task(&self, id: &str, patch: &TaskPatch) -> Result<Task, ForgeError> {
        self.patch(&format!("/v1/tasks/{id}"), patch).await
    }

    // ── Agents ────────────────────────────────────────────────────────────────
    pub async fn list_agents(&self, project_id: &str) -> Result<Vec<Agent>, ForgeError> {
        self.get(&format!("/v1/projects/{project_id}/agents")).await
    }
    pub async fn create_agent(&self, input: &AgentCreate) -> Result<Agent, ForgeError> {
        self.post("/v1/agents", input).await
    }
    pub async fn get_agent(&self, id: &str) -> Result<Agent, ForgeError> {
        self.get(&format!("/v1/agents/{id}")).await
    }
    pub async fn update_agent(&self, id: &str, patch: &AgentPatch) -> Result<Agent, ForgeError> {
        self.patch(&format!("/v1/agents/{id}"), patch).await
    }
    pub async fn delete_agent(&self, id: &str) -> Result<(), ForgeError> {
        self.delete(&format!("/v1/agents/{id}")).await
    }

    // ── Swarms ────────────────────────────────────────────────────────────────
    pub async fn create_swarm(&self, input: &SwarmCreate) -> Result<Swarm, ForgeError> {
        self.post("/v1/swarms", input).await
    }
    pub async fn get_swarm(&self, id: &str) -> Result<Swarm, ForgeError> {
        self.get(&format!("/v1/swarms/{id}")).await
    }
    pub async fn send_message(
        &self, swarm_id: &str, msg: &MessageCreate,
    ) -> Result<Message, ForgeError> {
        self.post(&format!("/v1/swarms/{swarm_id}/messages"), msg).await
    }

    // ── Runs ──────────────────────────────────────────────────────────────────
    pub async fn get_run_trace(&self, id: &str) -> Result<RunTrace, ForgeError> {
        self.get(&format!("/v1/runs/{id}")).await
    }
    pub async fn get_replay_script(&self, id: &str) -> Result<String, ForgeError> {
        let res = self
            .auth(self.http.get(format!("{}/v1/runs/{id}/replay.sh", self.base)))
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            return Err(ForgeError::Http(status, res.text().await.unwrap_or_default()));
        }
        res.text().await.map_err(ForgeError::Network)
    }
}
