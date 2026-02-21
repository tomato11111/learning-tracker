/**
 * Popup UI Script for Passive Learning Tracker
 */

// API設定を取得
async function getApiConfig() {
  try {
    const stored = await chrome.storage.sync.get(['environment', 'apiEndpoint']);
    const env = stored.environment || 'development';
    const baseUrl = env === 'development'
      ? 'http://localhost:3000'
      : stored.apiEndpoint?.replace('/api/track', '') || 'https://your-domain.com';

    return {
      statsEndpoint: `${baseUrl}/api/stats`,
      dashboardUrl: baseUrl
    };
  } catch (error) {
    console.error('Failed to get config:', error);
    return {
      statsEndpoint: 'http://localhost:3000/api/stats',
      dashboardUrl: 'http://localhost:3000'
    };
  }
}

// 統計情報を取得して表示
async function loadStats() {
  try {
    const config = await getApiConfig();
    const response = await fetch(config.statsEndpoint);

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const result = await response.json();
    const stats = result.data;

    displayStats(stats, config.dashboardUrl);
    updateStatus('接続済み');

  } catch (error) {
    console.error('Error loading stats:', error);
    displayError();
    updateStatus('サーバーに接続できません');
  }
}

// 統計情報を表示
function displayStats(stats, dashboardUrl) {
  const totalMinutes = Math.floor(stats.total_learning_time_seconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const timeDisplay = totalHours > 0
    ? `${totalHours}時間 ${remainingMinutes}分`
    : `${totalMinutes}分`;

  const html = `
    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">📊 総学習時間</span>
        <span class="stat-value">${timeDisplay}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">📄 学習ページ数</span>
        <span class="stat-value">${stats.total_pages}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">🎥 YouTube動画</span>
        <span class="stat-value">${stats.youtube_videos}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">🧠 AI要約済み</span>
        <span class="stat-value">${stats.summarized_logs}</span>
      </div>
    </div>
    <button class="button" id="open-dashboard">
      📊 ダッシュボードを開く
    </button>
  `;

  document.getElementById('content').innerHTML = html;

  // ダッシュボードボタンのイベント
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: dashboardUrl });
  });
}

// エラー表示
function displayError() {
  const html = `
    <div class="stats">
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
        <div>サーバーに接続できません</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
          サーバーが起動しているか確認してください
        </div>
      </div>
    </div>
    <button class="button" id="retry-button">
      🔄 再試行
    </button>
  `;

  document.getElementById('content').innerHTML = html;

  // 再試行ボタンのイベント
  document.getElementById('retry-button').addEventListener('click', () => {
    document.getElementById('content').innerHTML = '<div class="loading">読み込み中...</div>';
    loadStats();
  });
}

// ステータスを更新
function updateStatus(text) {
  document.getElementById('status-text').textContent = text;
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
});
