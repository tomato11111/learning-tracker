/**
 * Database Connection Module
 * MySQL接続を管理し、接続プールを提供します
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// 接続設定
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'passive_learning_tracker',
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 5 : 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000, // 10秒
  // 本番環境での追加設定
  ...(process.env.NODE_ENV === 'production' && {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  })
};

// デバッグ用（パスワードは伏せる）
console.log('📊 Database Config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  environment: process.env.NODE_ENV || 'development',
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
});

// 接続プールの作成
const pool = mysql.createPool(dbConfig);

/**
 * データベース接続のテスト
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * クエリ実行のヘルパー関数
 * @param {string} sql - 実行するSQLクエリ
 * @param {Array} params - バインドするパラメータ
 * @returns {Promise<Array>} クエリ結果
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

/**
 * トランザクション実行のヘルパー関数
 * @param {Function} callback - トランザクション内で実行する処理
 * @returns {Promise<any>} コールバックの戻り値
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 接続プールをクローズ
 */
async function closePool() {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing pool:', error.message);
  }
}

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
