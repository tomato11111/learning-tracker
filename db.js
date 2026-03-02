/**
 * Database Connection Module
 * PostgreSQL (Neon) 接続を管理し、接続プールを提供します
 */

require('dotenv').config();
const { Pool } = require('pg');

// 接続設定（NeonのDATABASE_URLを使用）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon接続に必須
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log('📊 Database: Neon PostgreSQL');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

/**
 * データベース接続のテスト
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
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
    const result = await pool.query(sql, params);
    return result.rows;
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
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
