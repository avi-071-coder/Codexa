// Popup Component — Main popup UI for the Codexa extension.

import { useState } from "react";
import {
  useConnectionStatus,
  useAnalytics,
  useSyncStatus,
  useRecentSubmissions,
  useGitHubAuth,
} from "../hooks/useMessaging";

export function Popup() {
  const { status, loading: statusLoading, refresh: refreshStatus } = useConnectionStatus();
  const { analytics, loading: analyticsLoading } = useAnalytics();
  const { syncStatus } = useSyncStatus();
  const { submissions } = useRecentSubmissions();
  const { authState, connect, disconnect } = useGitHubAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "recent" | "settings">("overview");

  const isLoading = statusLoading || analyticsLoading;

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <div className="logo-section">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
              <path
                d="M8 14L12 18L20 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#6C63FF" />
                  <stop offset="1" stopColor="#A855F7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="logo-text">
            <h1>Codexa</h1>
            <span className="version">v1.0.0</span>
          </div>
        </div>
        <ConnectionBadge connected={status.connected} login={status.login} />
      </header>

      {/* Connection Flow */}
      {!status.connected && !isLoading && (
        <ConnectSection authState={authState} onConnect={connect} />
      )}

      {/* Main Content */}
      {status.connected && (
        <>
          {/* Tab Navigation */}
          <nav className="tab-nav">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zm-7 7h5v5H2V9zm7 0h5v5H9V9z" opacity="0.8" />
              </svg>
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === "recent" ? "active" : ""}`}
              onClick={() => setActiveTab("recent")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5v4.25l3 1.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Recent
            </button>
            <button
              className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
                <path d="M13.5 8c0-.3-.2-.6-.4-.8l1-1.7-1-1.7-2 .4c-.4-.3-.8-.5-1.3-.6L9 2H7l-.8 1.6c-.5.1-.9.3-1.3.6l-2-.4-1 1.7 1 1.7c-.2.2-.4.5-.4.8s.2.6.4.8l-1 1.7 1 1.7 2-.4c.4.3.8.5 1.3.6L7 14h2l.8-1.6c.5-.1.9-.3 1.3-.6l2 .4 1-1.7-1-1.7c.2-.2.4-.5.4-.8z" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Settings
            </button>
          </nav>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "overview" && (
              <OverviewTab analytics={analytics} syncStatus={syncStatus} />
            )}
            {activeTab === "recent" && (
              <RecentTab submissions={submissions} />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                status={status}
                onDisconnect={disconnect}
                onRefresh={refreshStatus}
              />
            )}
          </div>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="pulse-loader">
            <div className="pulse-dot" />
            <div className="pulse-dot" />
            <div className="pulse-dot" />
          </div>
          <p>Loading Codexa...</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ConnectionBadge({ connected, login }: { connected: boolean; login?: string }) {
  return (
    <div className={`connection-badge ${connected ? "connected" : "disconnected"}`}>
      <div className={`status-dot ${connected ? "online" : "offline"}`} />
      <span>{connected ? login ?? "Connected" : "Not Connected"}</span>
    </div>
  );
}

function ConnectSection({
  authState,
  onConnect,
}: {
  authState: ReturnType<typeof useGitHubAuth>["authState"];
  onConnect: (token: string, repoUrl: string) => void;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim() && token.trim()) {
      onConnect(token.trim(), repoUrl.trim());
    }
  };

  return (
    <div className="connect-section">
      <div className="connect-illustration">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" stroke="url(#connectGrad)" strokeWidth="2" strokeDasharray="6 4" />
          <path
            d="M40 20C29 20 20 29 20 40s9 20 20 20 20-9 20-20-9-20-20-20zm0 5c2.8 0 5.3 1.5 7 3.8-1.7 1.9-4.2 3.2-7 3.2s-5.3-1.3-7-3.2c1.7-2.3 4.2-3.8 7-3.8zm-12 15c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12-12-5.4-12-12z"
            fill="url(#connectGrad)"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="connectGrad" x1="0" y1="0" x2="80" y2="80">
              <stop stopColor="#6C63FF" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h2>Connect to GitHub</h2>
      <p className="connect-desc">
        Paste your GitHub repo link and a Personal Access Token to start syncing.
      </p>

      <form className="connect-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="repo-url" className="form-label">Repository URL</label>
          <input
            id="repo-url"
            type="text"
            className="form-input"
            placeholder="https://github.com/username/repo-name"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            autoComplete="url"
            spellCheck={false}
          />
          <p className="form-hint">
            Paste your repo link, or just <code>username/repo</code>. We'll create it if it doesn't exist.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="gh-token" className="form-label">Personal Access Token</label>
          <div className="input-with-toggle">
            <input
              id="gh-token"
              type={showToken ? "text" : "password"}
              className="form-input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowToken(!showToken)}
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="form-hint">
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Codexa%20Extension"
              target="_blank"
              rel="noopener noreferrer"
            >
              Generate a token →
            </a>{" "}
            (needs <code>repo</code> scope)
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={!repoUrl.trim() || !token.trim() || authState.status === "connecting"}
          id="connect-github-btn"
        >
          {authState.status === "connecting" ? (
            <>
              <span className="spinner" /> Connecting...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0110 4.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z"
                />
              </svg>
              Connect GitHub
            </>
          )}
        </button>

        {authState.status === "error" && (
          <p className="error-msg">{authState.error}</p>
        )}
      </form>
    </div>
  );
}


function OverviewTab({
  analytics,
  syncStatus,
}: {
  analytics: ReturnType<typeof useAnalytics>["analytics"];
  syncStatus: ReturnType<typeof useSyncStatus>["syncStatus"];
}) {
  if (!analytics) {
    return (
      <div className="empty-state">
        <p>No submissions yet. Solve a problem on LeetCode to get started!</p>
      </div>
    );
  }

  return (
    <div className="overview-tab">
      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Solved"
          value={analytics.total}
          icon="🏆"
          color="var(--accent-blue)"
        />
        <StatCard
          label="Current Streak"
          value={`${analytics.streak.current}d`}
          icon="🔥"
          color="var(--accent-orange)"
        />
        <StatCard
          label="Longest Streak"
          value={`${analytics.streak.longest}d`}
          icon="⚡"
          color="var(--accent-purple)"
        />
        <StatCard
          label="Languages"
          value={Object.keys(analytics.byLanguage).length}
          icon="💻"
          color="var(--accent-green)"
        />
      </div>

      {/* Difficulty Breakdown */}
      <div className="section">
        <h3 className="section-title">Difficulty</h3>
        <div className="difficulty-bars">
          <DifficultyBar
            label="Easy"
            count={analytics.byDifficulty["Easy"] ?? 0}
            total={analytics.total}
            color="var(--difficulty-easy)"
          />
          <DifficultyBar
            label="Medium"
            count={analytics.byDifficulty["Medium"] ?? 0}
            total={analytics.total}
            color="var(--difficulty-medium)"
          />
          <DifficultyBar
            label="Hard"
            count={analytics.byDifficulty["Hard"] ?? 0}
            total={analytics.total}
            color="var(--difficulty-hard)"
          />
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="section sync-status">
          <h3 className="section-title">Sync Status</h3>
          <div className="sync-pills">
            {syncStatus.synced > 0 && (
              <span className="pill pill-synced">✓ {syncStatus.synced} synced</span>
            )}
            {syncStatus.pending > 0 && (
              <span className="pill pill-pending">⏳ {syncStatus.pending} pending</span>
            )}
            {syncStatus.failed > 0 && (
              <span className="pill pill-failed">✗ {syncStatus.failed} failed</span>
            )}
          </div>
          {syncStatus.lastSyncedAt && (
            <p className="last-sync">
              Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Weekly Activity Mini Chart */}
      {analytics.weekly.length > 0 && (
        <div className="section">
          <h3 className="section-title">Weekly Activity</h3>
          <div className="mini-chart">
            {analytics.weekly.map((w) => {
              const maxCount = Math.max(...analytics.weekly.map((x) => x.count), 1);
              const height = Math.max((w.count / maxCount) * 60, 4);
              return (
                <div key={w.week} className="chart-bar-wrapper" title={`${w.week}: ${w.count}`}>
                  <div
                    className="chart-bar"
                    style={{ height: `${height}px` }}
                  />
                  <span className="chart-label">{w.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className="stat-card" style={{ "--stat-color": color } as React.CSSProperties}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function DifficultyBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="difficulty-row">
      <span className="diff-label">{label}</span>
      <div className="diff-bar-track">
        <div
          className="diff-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="diff-count">{count}</span>
    </div>
  );
}

function RecentTab({
  submissions,
}: {
  submissions: Array<{
    title: string;
    platform: string;
    difficulty: string;
    language: string;
    submittedAt: string;
    slug: string;
  }>;
}) {
  if (submissions.length === 0) {
    return (
      <div className="empty-state">
        <p>No recent submissions. Start solving!</p>
      </div>
    );
  }

  return (
    <div className="recent-tab">
      {submissions.map((s, i) => (
        <div key={`${s.slug}-${i}`} className="submission-card">
          <div className="submission-header">
            <span className="submission-title">{s.title}</span>
            <span className={`difficulty-tag ${s.difficulty.toLowerCase()}`}>
              {s.difficulty}
            </span>
          </div>
          <div className="submission-meta">
            <span className="meta-item">
              <span className="meta-icon">📌</span> {s.platform}
            </span>
            <span className="meta-item">
              <span className="meta-icon">💻</span> {s.language}
            </span>
            <span className="meta-item">
              <span className="meta-icon">🕐</span>{" "}
              {new Date(s.submittedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({
  status,
  onDisconnect,
  onRefresh,
}: {
  status: ReturnType<typeof useConnectionStatus>["status"];
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="settings-tab">
      <div className="section">
        <h3 className="section-title">GitHub Account</h3>
        <div className="settings-row">
          <div className="settings-info">
            <span className="settings-label">Connected as</span>
            <span className="settings-value">{status.login ?? "—"}</span>
          </div>
        </div>
        {status.repo && (
          <div className="settings-row">
            <div className="settings-info">
              <span className="settings-label">Repository</span>
              <a
                href={`https://github.com/${status.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="settings-value link"
              >
                {status.repo}
              </a>
            </div>
          </div>
        )}
        {status.connectedAt && (
          <div className="settings-row">
            <div className="settings-info">
              <span className="settings-label">Connected since</span>
              <span className="settings-value">
                {new Date(status.connectedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">Actions</h3>
        <button className="btn-secondary" onClick={onRefresh} id="refresh-btn">
          Refresh Status
        </button>
        <button className="btn-danger" onClick={onDisconnect} id="disconnect-btn">
          Disconnect GitHub
        </button>
      </div>

      <div className="section">
        <h3 className="section-title">About</h3>
        <p className="about-text">
          Codexa v1.0.0 — Auto-syncs your accepted competitive programming
          submissions to GitHub. Your code stays local until synced.
          No data is sent anywhere except GitHub.
        </p>
      </div>
    </div>
  );
}
