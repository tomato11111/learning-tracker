/**
 * Content Script for Passive Learning Tracker
 * ページの学習データを監視し、定期的にサーバーへ送信
 */

(function () {
  'use strict';

  // 設定を動的に読み込む
  let CONFIG = null;

  // 設定の初期化
  async function initConfig() {
    try {
      // Chrome Storageから設定を取得
      const stored = await chrome.storage.sync.get(['apiEndpoint', 'environment']);

      const isDevelopment = !stored.environment || stored.environment === 'development';

      CONFIG = {
        API_ENDPOINT: stored.apiEndpoint || (isDevelopment
          ? 'http://localhost:3000/api/track'
          : 'https://your-domain.com/api/track'),
        TRACKING_INTERVAL: 60000, // 1分ごとに送信
        STORAGE_KEY: 'pending_learning_logs',
        MIN_TRACKING_TIME: 5, // 最低5秒以上の滞在で記録開始
        ENVIRONMENT: isDevelopment ? 'development' : 'production'
      };

      console.log('🔧 Config loaded:', CONFIG.ENVIRONMENT, CONFIG.API_ENDPOINT);
    } catch (error) {
      // Fallback to default (development)
      CONFIG = {
        API_ENDPOINT: 'http://localhost:3000/api/track',
        TRACKING_INTERVAL: 60000,
        STORAGE_KEY: 'pending_learning_logs',
        MIN_TRACKING_TIME: 5,
        ENVIRONMENT: 'development'
      };
      console.warn('⚠️  Using default config:', error);
    }
  }

  // 学習時間の追跡
  let startTime = Date.now();
  let lastTrackedTime = 0; // 最後に送信した時刻（経過秒）
  let lastYouTubePosition = 0; // 最後に記録したYouTubeの再生位置
  let isTracking = false;
  let trackingInterval = null;
  let pageTitle = document.title;
  let currentUrl = window.location.href;
  const isYouTube = currentUrl.includes('youtube.com/watch');

  /**
   * YouTube動画の視聴時間（差分）を取得
   * @returns {number} 前回から視聴した秒数
   */
  function getYouTubeProgressDelta() {
    try {
      const video = document.querySelector('video');
      if (video && !video.paused) {
        const currentPosition = Math.floor(video.currentTime);

        // 前回の位置からの差分を計算
        // シーク（巻き戻し/早送り）を検出した場合は、実際の視聴時間を計算
        const delta = Math.abs(currentPosition - lastYouTubePosition);

        // 大きなジャンプ（30秒以上）の場合は、シークと判断してカウントしない
        if (delta > 30) {
          console.log(`📹 YouTube seek detected: ${lastYouTubePosition}s → ${currentPosition}s`);
          lastYouTubePosition = currentPosition;
          return 0;
        }

        lastYouTubePosition = currentPosition;
        return delta;
      }
    } catch (error) {
      console.error('YouTube progress extraction failed:', error);
    }
    return 0;
  }

  /**
   * 一般サイトの滞在時間（差分）を計算
   * @returns {number} 前回から経過した秒数
   */
  function getPageProgressDelta() {
    const currentTime = Date.now();
    const currentElapsed = Math.floor((currentTime - startTime) / 1000);
    const delta = currentElapsed - lastTrackedTime;
    lastTrackedTime = currentElapsed;
    return delta;
  }

  /**
   * 現在の学習進捗（差分）を取得
   * @returns {number} 前回から学習した秒数
   */
  function getCurrentProgressDelta() {
    // YouTube動画の場合は視聴時間の差分を優先
    if (isYouTube) {
      return getYouTubeProgressDelta();
    }

    // それ以外は滞在時間の差分
    return getPageProgressDelta();
  }

  /**
   * 学習データをサーバーに送信
   * @param {Object} data - 送信するデータ
   * @returns {Promise<boolean>} 成功したかどうか
   */
  async function sendToServer(data) {
    try {
      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Learning data sent successfully:', result);
      return true;

    } catch (error) {
      console.error('❌ Failed to send learning data:', error.message);
      return false;
    }
  }

  /**
   * ローカルストレージに一時保存
   * @param {Object} data - 保存するデータ
   */
  async function saveToLocalStorage(data) {
    try {
      const stored = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
      const pendingLogs = stored[CONFIG.STORAGE_KEY] || [];

      pendingLogs.push({
        ...data,
        timestamp: Date.now()
      });

      await chrome.storage.local.set({
        [CONFIG.STORAGE_KEY]: pendingLogs
      });

      console.log('💾 Data saved to local storage (retry queue)');
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  /**
   * 保留中のログをリトライ送信
   */
  async function retryPendingLogs() {
    try {
      const stored = await chrome.storage.local.get(CONFIG.STORAGE_KEY);
      const pendingLogs = stored[CONFIG.STORAGE_KEY] || [];

      if (pendingLogs.length === 0) return;

      console.log(`📤 Retrying ${pendingLogs.length} pending logs...`);

      const successfulLogs = [];

      for (const log of pendingLogs) {
        const success = await sendToServer(log);
        if (success) {
          successfulLogs.push(log);
        }
      }

      // 成功したログを削除
      if (successfulLogs.length > 0) {
        const remainingLogs = pendingLogs.filter(
          log => !successfulLogs.includes(log)
        );

        await chrome.storage.local.set({
          [CONFIG.STORAGE_KEY]: remainingLogs
        });

        console.log(`✅ ${successfulLogs.length} pending logs sent successfully`);
      }

    } catch (error) {
      console.error('Failed to retry pending logs:', error);
    }
  }

  /**
   * 学習データを記録
   */
  async function trackLearning() {
    const progress = getCurrentProgressDelta();

    // 最低追跡時間に達していない場合はスキップ
    if (progress < CONFIG.MIN_TRACKING_TIME) {
      console.log('⏭️  Skipping tracking (too short)');
      return;
    }

    const data = {
      url: currentUrl,
      title: pageTitle || document.title,
      progress_time: progress,
      status: 'in_progress'
    };

    console.log('📊 Tracking learning:', data);

    // サーバーへ送信
    const success = await sendToServer(data);

    // 失敗した場合はローカルストレージに保存
    if (!success) {
      await saveToLocalStorage(data);
    }

    // タイマーをリセット（累積ではなく差分を記録するため）
    startTime = Date.now();
  }

  /**
   * トラッキングを開始
   */
  function startTracking() {
    if (isTracking) return;

    console.log('▶️  Learning tracker started');
    isTracking = true;
    startTime = Date.now();

    // 初回はページロード時にリトライ
    retryPendingLogs();

    // 定期的に記録
    trackingInterval = setInterval(() => {
      trackLearning();
      retryPendingLogs(); // リトライも定期実行
    }, CONFIG.TRACKING_INTERVAL);

    // ページ離脱時に最後の記録を送信
    window.addEventListener('beforeunload', () => {
      trackLearning();
    });
  }

  /**
   * トラッキングを停止
   */
  function stopTracking() {
    if (!isTracking) return;

    console.log('⏸️  Learning tracker stopped');
    isTracking = false;

    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }

    // 最後の記録を送信
    trackLearning();
  }

  /**
   * ページの可視性が変わった時の処理
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      stopTracking();
    } else {
      startTracking();
    }
  }

  /**
   * 権限を確認し、必要に応じてバナーを表示
   */
  async function checkPermissions() {
    // ローカルホストまたは既に許可されている場合はスキップ
    if (currentUrl.startsWith('http://localhost')) {
      return true;
    }

    try {
      const origin = new URL(currentUrl).origin + '/*';
      const hasPermission = await chrome.permissions.contains({
        origins: [origin]
      });

      if (!hasPermission) {
        showPermissionBanner(origin);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return true; // エラー時は安全のため続行を試める
    }
  }

  /**
   * 権限許可を求めるカスタムバナーを表示
   */
  function showPermissionBanner(origin) {
    if (document.getElementById('plt-permission-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'plt-permission-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #4f46e5;
      color: white;
      padding: 12px 20px;
      z-index: 999999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    `;

    const text = document.createElement('div');
    text.innerHTML = `<strong>Passive Learning Tracker</strong>: このサイト（${new URL(currentUrl).hostname}）で学習記録を有効にしますか？`;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '10px';

    const allowBtn = document.createElement('button');
    allowBtn.innerText = '有効にする';
    allowBtn.style.cssText = `
      background: white;
      color: #4f46e5;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;

    const ignoreBtn = document.createElement('button');
    ignoreBtn.innerText = '今回はしない';
    ignoreBtn.style.cssText = `
      background: transparent;
      color: white;
      border: 1px solid white;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
    `;

    allowBtn.onclick = async () => {
      try {
        const granted = await chrome.permissions.request({
          origins: [origin]
        });
        if (granted) {
          banner.remove();
          startTracking();
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    };

    ignoreBtn.onclick = () => {
      banner.remove();
    };

    actions.appendChild(ignoreBtn);
    actions.appendChild(allowBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    // ボディにパディングを追加してコンテンツが隠れないようにする
    document.body.style.paddingTop = '50px';
  }

  /**
   * 初期化
   */
  async function init() {
    // 設定を初期化
    await initConfig();

    console.log('🚀 Passive Learning Tracker initialized');
    console.log('📄 Page:', pageTitle);
    console.log('🔗 URL:', currentUrl);

    // 権限を確認
    const isPermitted = await checkPermissions();

    // ページが表示されており、かつ権限がある場合のみトラッキング開始
    if (!document.hidden && isPermitted) {
      startTracking();
    }

    // 可視性の変更を監視
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // タイトルの変更を監視（SPAなど）
    const observer = new MutationObserver(() => {
      if (document.title !== pageTitle) {
        pageTitle = document.title;
        console.log('📄 Page title changed:', pageTitle);
      }
    });

    observer.observe(document.querySelector('title') || document.head, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
