/**
 * Database Connection Module
 * MySQL接続を管理し、接続プールを提供します
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// 接続プールの作成
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'passive_learning_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

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
