import fs from 'node:fs/promises';
import 'dotenv/config';
import { pool } from './db.js';
const sql = await fs.readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
await pool.query(sql);
await pool.end();
console.log('Database schema applied.');
