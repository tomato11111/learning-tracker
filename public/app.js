/**
 * Dashboard JavaScript for Passive Learning Tracker
 */

// Global state
let allLogs = [];
let filteredLogs = [];

// DOM Elements
const logsContainer = document.getElementById('logs-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const noDataElement = document.getElementById('no-data');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const refreshBtn = document.getElementById('refresh-btn');

// Stats Elements
const totalTimeEl = document.getElementById('total-time');
const totalPagesEl = document.getElementById('total-pages');
const youtubeVideosEl = document.getElementById('youtube-videos');
const summarizedLogsEl = document.getElementById('summarized-logs');

/**
 * 時間を「○分○秒」形式に変換
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0秒';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

  return parts.join(' ');
}

/**
 * 日付を「YYYY年MM月DD日」形式に変換
 * @param {string} dateString - 日付文字列
 * @returns {string} フォーマットされた日付
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return '今日';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨日';
  }

  return `${year}年${month}月${day}日`;
}

/**
 * 時刻を「HH:MM」形式に変換
 * @param {string} dateString - 日付文字列
 * @returns {string} フォーマットされた時刻
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * URLを短縮
 * @param {string} url - URL
 * @param {number} maxLength - 最大長
 * @returns {string} 短縮されたURL
 */
function truncateUrl(url, maxLength = 80) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

/**
 * 統計情報を読み込む
 */
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const result = await response.json();

    if (result.success) {
      const stats = result.data;

      // 総学習時間
      const totalSeconds = stats.total_learning_time_seconds || 0;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      if (totalHours > 0) {
        totalTimeEl.textContent = `${totalHours}時間 ${remainingMinutes}分`;
      } else {
        totalTimeEl.textContent = `${totalMinutes}分`;
      }

      totalPagesEl.textContent = stats.total_pages || 0;
      youtubeVideosEl.textContent = stats.youtube_videos || 0;
      summarizedLogsEl.textContent = stats.summarized_logs || 0;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * 学習ログを読み込む
 */
async function loadLogs() {
  try {
    showLoading();

    const response = await fetch('/api/logs?limit=100');
    const result = await response.json();

    if (result.success) {
      allLogs = result.data;
      filterAndDisplayLogs();
      hideLoading();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
    showError();
  }
}

/**
 * ログをフィルタリングして表示
 */
function filterAndDisplayLogs() {
  // 検索フィルター
  const searchTerm = searchInput.value.toLowerCase();
  const statusFilter = filterStatus.value;

  filteredLogs = allLogs.filter(log => {
    // 検索条件
    const matchesSearch = !searchTerm ||
      (log.title && log.title.toLowerCase().includes(searchTerm)) ||
      (log.url && log.url.toLowerCase().includes(searchTerm));

    // ステータス条件
    let matchesStatus = true;
    if (statusFilter === 'summarized') {
      matchesStatus = log.ai_summary !== null;
    } else if (statusFilter === 'unsummarized') {
      matchesStatus = log.ai_summary === null;
    }

    return matchesSearch && matchesStatus;
  });

  displayLogs(filteredLogs);
}

/**
 * ログを表示
 * @param {Array} logs - 表示するログ
 */
function displayLogs(logs) {
  if (logs.length === 0) {
    showNoData();
    return;
  }

  // 日付ごとにグループ化
  const groupedLogs = groupLogsByDate(logs);

  // HTML生成
  const html = Object.entries(groupedLogs).map(([date, dateLogs]) => {
    const logsHtml = dateLogs.map(log => createLogCard(log)).join('');

    return `
      <div class="date-group">
        <div class="date-header">
          📅 ${date}
        </div>
        ${logsHtml}
      </div>
    `;
  }).join('');

  logsContainer.innerHTML = html;
  logsContainer.style.display = 'flex';
  noDataElement.style.display = 'none';
}

/**
 * ログカードのHTMLを生成
 * @param {Object} log - ログデータ
 * @returns {string} HTML
 */
function createLogCard(log) {
  const statusClass = `status-${log.status}`;
  const statusText = {
    'in_progress': '学習中',
    'completed': '完了',
    'paused': '一時停止'
  }[log.status] || log.status;

  const summaryHtml = log.ai_summary
    ? `<div class="log-summary">${log.ai_summary}</div>`
    : '';

  return `
    <div class="log-card">
      <div class="log-header">
        <div class="log-title">${log.title || 'タイトルなし'}</div>
        <div class="log-time">${formatTime(log.updated_at)}</div>
      </div>
      <a href="${log.url}" target="_blank" class="log-url" title="${log.url}">
        ${truncateUrl(log.url)}
      </a>
      <div class="log-meta">
        <div class="log-duration">
          ⏱️ ${formatDuration(log.progress_time)}
        </div>
        <div class="log-status ${statusClass}">
          ${statusText}
        </div>
        ${log.video_id ? '<div class="log-status status-youtube">🎥 YouTube</div>' : ''}
      </div>
      ${summaryHtml}
    </div>
  `;
}

/**
 * ログを日付ごとにグループ化
 * @param {Array} logs - ログ配列
 * @returns {Object} 日付ごとのログ
 */
function groupLogsByDate(logs) {
  const grouped = {};

  logs.forEach(log => {
    const date = formatDate(log.updated_at);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(log);
  });

  return grouped;
}

/**
 * ローディング表示
 */
function showLoading() {
  loadingElement.style.display = 'block';
  errorElement.style.display = 'none';
  logsContainer.style.display = 'none';
  noDataElement.style.display = 'none';
}

/**
 * ローディング非表示
 */
function hideLoading() {
  loadingElement.style.display = 'none';
}

/**
 * エラー表示
 */
function showError() {
  loadingElement.style.display = 'none';
  errorElement.style.display = 'block';
  logsContainer.style.display = 'none';
  noDataElement.style.display = 'none';
}

/**
 * データなし表示
 */
function showNoData() {
  loadingElement.style.display = 'none';
  errorElement.style.display = 'none';
  logsContainer.style.display = 'none';
  noDataElement.style.display = 'block';
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
  // 検索入力
  searchInput.addEventListener('input', () => {
    filterAndDisplayLogs();
  });

  // ステータスフィルター
  filterStatus.addEventListener('change', () => {
    filterAndDisplayLogs();
  });

  // 更新ボタン
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.textContent = '🔄 更新中...';
    refreshBtn.disabled = true;

    await Promise.all([loadStats(), loadLogs()]);

    refreshBtn.textContent = '🔄 更新';
    refreshBtn.disabled = false;
  });
}

/**
 * 初期化
 */
async function init() {
  console.log('Dashboard initializing...');

  setupEventListeners();

  // 初期データ読み込み
  await Promise.all([
    loadStats(),
    loadLogs()
  ]);

  // 5分ごとに自動更新
  setInterval(() => {
    console.log('Auto-refreshing data...');
    loadStats();
    loadLogs();
  }, 5 * 60 * 1000);

  console.log('Dashboard initialized');
}

// ページ読み込み完了時に初期化
// ページ読み込み完了時に初期化 (Moved to bottom to allow extensions)
// document.addEventListener('DOMContentLoaded', init); 

// ===========================
// Analytics Functions
// ===========================

let trendsChart = null;
let currentPeriod = 'weekly';

/**
 * ヒートマップデータを読み込む
 */
async function loadHeatmap() {
  try {
    const response = await fetch('/api/analytics/heatmap?days=365');
    const result = await response.json();

    if (result.success) {
      renderHeatmap(result.data);
    }
  } catch (error) {
    console.error('Failed to load heatmap:', error);
    document.getElementById('heatmap-loading').textContent = 'データの読み込みに失敗しました';
  }
}

/**
 * ヒートマップを描画
 * @param {Array} data - ヒートマップデータ
 */
function renderHeatmap(data) {
  const heatmapEl = document.getElementById('heatmap');
  const loadingEl = document.getElementById('heatmap-loading');

  loadingEl.style.display = 'none';
  heatmapEl.innerHTML = '';

  // 過去365日分の日付を生成
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }

  // データをマップに変換
  const dataMap = {};
  data.forEach(item => {
    dataMap[item.date] = item;
  });

  // セルを生成
  days.forEach(date => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';

    const dayData = dataMap[date];
    const level = dayData ? dayData.level : 0;
    const totalSeconds = dayData ? dayData.totalSeconds : 0;
    const logCount = dayData ? dayData.logCount : 0;

    cell.setAttribute('data-level', level);
    cell.setAttribute('data-date', date);

    // ツールチップ
    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';

    const minutes = Math.floor(totalSeconds / 60);
    tooltip.textContent = `${date}: ${minutes}分 (${logCount}ページ)`;

    cell.appendChild(tooltip);
    heatmapEl.appendChild(cell);
  });
}

/**
 * トレンドグラフを読み込む
 * @param {string} period - 'weekly' または 'monthly'
 */
async function loadTrends(period = 'weekly') {
  try {
    const response = await fetch(`/api/analytics/trends?period=${period}`);
    const result = await response.json();

    if (result.success) {
      renderTrendsChart(result.data, period);
      currentPeriod = period;
    }
  } catch (error) {
    console.error('Failed to load trends:', error);
  }
}

/**
 * トレンドグラフを描画
 * @param {Array} data - トレンドデータ
 * @param {string} period - 期間
 */
function renderTrendsChart(data, period) {
  const ctx = document.getElementById('trendsChart');

  // 既存のチャートを破棄
  if (trendsChart) {
    trendsChart.destroy();
  }

  // ラベルとデータを準備
  const labels = data.map(item => item.period);
  const learningTime = data.map(item => Math.floor(item.total_seconds / 60)); // 分に変換
  const logCounts = data.map(item => item.log_count);

  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '学習時間（分）',
          data: learningTime,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: '学習ページ数',
          data: logCounts,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '学習時間（分）'
          },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'ページ数'
          },
          beginAtZero: true,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

/**
 * チャート期間切り替えボタンの設定
 */
function setupChartControls() {
  const chartBtns = document.querySelectorAll('.chart-btn');

  chartBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const period = btn.getAttribute('data-period');
      loadTrends(period);
    });
  });
}

// ===========================
// Initialize Analytics
// ===========================

// 既存のinit関数を拡張
const originalInit = init;
init = async function () {
  await originalInit();

  // アナリティクスの初期化
  loadHeatmap();
  loadTrends('weekly');
  setupChartControls();
};

// ===========================
// Final Initialization
// ===========================
document.addEventListener('DOMContentLoaded', init);
