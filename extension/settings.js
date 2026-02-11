/**
 * Settings Page Script
 */

// 環境別のデフォルト設定
const ENV_DEFAULTS = {
  development: {
    apiEndpoint: 'http://localhost:3000/api/track'
  },
  production: {
    apiEndpoint: 'https://your-domain.com/api/track'
  }
};

// DOM要素
const environmentSelect = document.getElementById('environment');
const apiEndpointInput = document.getElementById('apiEndpoint');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const currentEnvSpan = document.getElementById('currentEnv');
const currentApiSpan = document.getElementById('currentApi');

// 現在の設定を読み込む
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(['environment', 'apiEndpoint']);
    
    const env = stored.environment || 'development';
    const api = stored.apiEndpoint || ENV_DEFAULTS.development.apiEndpoint;
    
    environmentSelect.value = env;
    apiEndpointInput.value = api;
    
    updateCurrentSettings(env, api);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// 現在の設定を表示
function updateCurrentSettings(env, api) {
  currentEnvSpan.textContent = env === 'development' ? '開発環境' : '本番環境';
  currentApiSpan.textContent = api;
}

// 環境が変更された時のハンドラー
environmentSelect.addEventListener('change', () => {
  const env = environmentSelect.value;
  apiEndpointInput.value = ENV_DEFAULTS[env].apiEndpoint;
});

// 設定を保存
saveBtn.addEventListener('click', async () => {
  try {
    const environment = environmentSelect.value;
    const apiEndpoint = apiEndpointInput.value.trim();
    
    // バリデーション
    if (!apiEndpoint) {
      showStatus('error', 'APIエンドポイントを入力してください');
      return;
    }
    
    if (!apiEndpoint.startsWith('http://') && !apiEndpoint.startsWith('https://')) {
      showStatus('error', 'APIエンドポイントは http:// または https:// で始まる必要があります');
      return;
    }
    
    // 保存
    await chrome.storage.sync.set({
      environment,
      apiEndpoint
    });
    
    updateCurrentSettings(environment, apiEndpoint);
    showStatus('success', '✅ 設定を保存しました！ページをリロードすると反映されます。');
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('error', '❌ 設定の保存に失敗しました');
  }
});

// ステータスメッセージを表示
function showStatus(type, message) {
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  
  // 3秒後に非表示
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}

// 初期化
loadSettings();
