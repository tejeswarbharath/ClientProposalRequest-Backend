import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const tokenSecret = process.env.JWT_SECRET;
if (!tokenSecret) throw new Error('JWT_SECRET must be set before starting the API.');

function publicUser(user) { return { id: user.id, displayName: user.display_name, email: user.email }; }
function createToken(user) { return jwt.sign({ sub: user.id, email: user.email }, tokenSecret, { expiresIn: '8h' }); }

export async function signup({ displayName, email, password }) {
  const name = String(displayName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!name) throw Object.assign(new Error('Name is required.'), { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  if (String(password || '').length < 8) throw Object.assign(new Error('Password must have at least 8 characters.'), { status: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query('INSERT INTO app_users(display_name,email,password_hash) VALUES($1,$2,$3) RETURNING *', [name, normalizedEmail, passwordHash]);
    const user = result.rows[0];
    return { token: createToken(user), user: publicUser(user) };
  } catch (error) {
    if (error.code === '23505') throw Object.assign(new Error('An account already exists for this email.'), { status: 409 });
    throw error;
  }
}

export async function signin({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = (await pool.query('SELECT * FROM app_users WHERE email=$1', [normalizedEmail])).rows[0];
  if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) throw Object.assign(new Error('Email or password is incorrect.'), { status: 401 });
  return { token: createToken(user), user: publicUser(user) };
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sign in is required.' });
  try { req.user = jwt.verify(token, tokenSecret); return next(); }
  catch { return res.status(401).json({ message: 'Your session has expired. Sign in again.' }); }
}

export async function getCurrentUser(id) {
  const user = (await pool.query('SELECT id,display_name,email FROM app_users WHERE id=$1', [id])).rows[0];
  return user ? publicUser(user) : null;
}
