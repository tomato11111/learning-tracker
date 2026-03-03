/**
 * Popup UI Script for Passive Learning Tracker
 */

const VERCEL_URL = 'https://learning-tracker-9mlpt84mv-tomato11111s-projects.vercel.app';

// API設定を取得
async function getApiConfig() {
  try {
    const stored = await chrome.storage.sync.get(['apiEndpoint']);
    const baseUrl = stored.apiEndpoint
      ? stored.apiEndpoint.replace('/api/track', '')
      : VERCEL_URL;

    return {
      statsEndpoint: `${baseUrl}/api/stats`,
      dashboardUrl: baseUrl
    };
  } catch (error) {
    console.error('Failed to get config:', error);
    return {
      statsEndpoint: `${VERCEL_URL}/api/stats`,
      dashboardUrl: VERCEL_URL
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

  const content = document.getElementById('content');
  content.textContent = '';

  // stats ボックス
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats';

  const items = [
    { label: '📊 総学習時間', value: timeDisplay },
    { label: '📄 学習ページ数', value: stats.total_pages },
    { label: '🎥 YouTube動画', value: stats.youtube_videos },
    { label: '🧠 AI要約済み', value: stats.summarized_logs },
  ];

  items.forEach(({ label, value }) => {
    const item = document.createElement('div');
    item.className = 'stat-item';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
    labelSpan.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'stat-value';
    valueSpan.textContent = value;
    item.appendChild(labelSpan);
    item.appendChild(valueSpan);
    statsDiv.appendChild(item);
  });

  // ダッシュボードボタン
  const btn = document.createElement('button');
  btn.className = 'button';
  btn.id = 'open-dashboard';
  btn.textContent = '📊 ダッシュボードを開く';
  btn.addEventListener('click', () => {
    chrome.tabs.create({ url: dashboardUrl });
  });

  content.appendChild(statsDiv);
  content.appendChild(btn);
}

// エラー表示
function displayError() {
  const content = document.getElementById('content');
  content.textContent = '';

  // エラーボックス
  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats';

  const inner = document.createElement('div');
  inner.style.cssText = 'text-align: center; padding: 20px;';

  const icon = document.createElement('div');
  icon.style.cssText = 'font-size: 48px; margin-bottom: 12px;';
  icon.textContent = '⚠️';

  const msg = document.createElement('div');
  msg.textContent = 'サーバーに接続できません';

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size: 12px; opacity: 0.8; margin-top: 8px;';
  sub.textContent = 'サーバーが起動しているか確認してください';

  inner.appendChild(icon);
  inner.appendChild(msg);
  inner.appendChild(sub);
  statsDiv.appendChild(inner);

  // 再試行ボタン
  const btn = document.createElement('button');
  btn.className = 'button';
  btn.id = 'retry-button';
  btn.textContent = '🔄 再試行';
  btn.addEventListener('click', () => {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = '読み込み中...';
    content.textContent = '';
    content.appendChild(loading);
    loadStats();
  });

  content.appendChild(statsDiv);
  content.appendChild(btn);
}

// ステータスを更新
function updateStatus(text) {
  document.getElementById('status-text').textContent = text;
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
});
