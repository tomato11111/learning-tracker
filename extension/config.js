/**
 * Configuration for Passive Learning Tracker Extension
 * 環境別の設定を管理
 */

// 環境の自動判定
const isProduction = () => {
  // 本番環境の判定（必要に応じて調整）
  return !window.location.hostname.includes('localhost');
};

const CONFIG = {
  // 開発環境の設定
  development: {
    API_ENDPOINT: 'http://localhost:3000/api/track',
    STATS_ENDPOINT: 'http://localhost:3000/api/stats',
    DASHBOARD_URL: 'http://localhost:3000',
    TRACKING_INTERVAL: 60000, // 1分
    MIN_TRACKING_TIME: 5, // 5秒
  },

  // 本番環境の設定
  production: {
    API_ENDPOINT: 'https://learning-tracker-9mlpt84mv-tomato11111s-projects.vercel.app/api/track',
    STATS_ENDPOINT: 'https://learning-tracker-9mlpt84mv-tomato11111s-projects.vercel.app/api/stats',
    DASHBOARD_URL: 'https://learning-tracker-9mlpt84mv-tomato11111s-projects.vercel.app',
    TRACKING_INTERVAL: 60000, // 1分
    MIN_TRACKING_TIME: 5, // 5秒
  }
};

// 現在の環境に応じた設定を取得
// Chrome拡張はブラウザ上で動作するため、常にproduction設定を使用する
const getConfig = () => {
  const env = 'production';
  return {
    ...CONFIG[env],
    STORAGE_KEY: 'pending_learning_logs',
    environment: env
  };
};

// 設定をエクスポート
const CURRENT_CONFIG = getConfig();

console.log(`🔧 Extension Config loaded (${CURRENT_CONFIG.environment}):`, CURRENT_CONFIG);
