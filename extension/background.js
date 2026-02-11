/**
 * Background Service Worker for Passive Learning Tracker
 * バックグラウンドでの処理とメッセージングを管理
 */

// 拡張機能のインストール時
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Passive Learning Tracker installed:', details.reason);
  
  if (details.reason === 'install') {
    // 初回インストール時の処理
    console.log('Welcome to Passive Learning Tracker!');
    
    // デフォルト設定を保存
    chrome.storage.local.set({
      settings: {
        trackingEnabled: true,
        apiEndpoint: 'http://localhost:3000/api/track',
        trackingInterval: 60000
      }
    });
  }
});

// タブが更新された時
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
  }
});

// タブがアクティブになった時
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  console.log('Tab activated:', tab.url);
});

// メッセージ受信時の処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'track') {
    // Content scriptからのトラッキングリクエスト
    handleTrackRequest(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // 非同期レスポンスを示す
  }
  
  if (request.action === 'getStats') {
    // 統計情報のリクエスト
    getStats()
      .then(stats => sendResponse({ success: true, data: stats }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
});

/**
 * トラッキングリクエストを処理
 * @param {Object} data - トラッキングデータ
 */
async function handleTrackRequest(data) {
  try {
    const settings = await chrome.storage.local.get('settings');
    const apiEndpoint = settings.settings?.apiEndpoint || 'http://localhost:3000/api/track';
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Track request failed:', error);
    throw error;
  }
}

/**
 * 統計情報を取得
 */
async function getStats() {
  try {
    const response = await fetch('http://localhost:3000/api/stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
}

// 定期的なクリーンアップ（古い保留ログを削除）
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    cleanupOldLogs();
  }
});

/**
 * 古い保留ログをクリーンアップ
 */
async function cleanupOldLogs() {
  try {
    const stored = await chrome.storage.local.get('pending_learning_logs');
    const pendingLogs = stored.pending_learning_logs || [];
    
    // 24時間以上古いログを削除
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentLogs = pendingLogs.filter(log => log.timestamp > oneDayAgo);
    
    if (recentLogs.length < pendingLogs.length) {
      await chrome.storage.local.set({
        pending_learning_logs: recentLogs
      });
      
      console.log(`Cleaned up ${pendingLogs.length - recentLogs.length} old logs`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

console.log('Background service worker initialized');
