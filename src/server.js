import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './db.js';
import { createProposal, getProposal, updateProposal } from './repository.js';
import { generateEstimate } from './estimator.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    // Browser extensions and same-origin tooling may not send an Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req,res,next) => { try { await pool.query('SELECT 1'); res.json({ status:'ok' }); } catch(error) { next(error); } });
app.get('/api/proposals', async (_req,res,next) => { try { const result = await pool.query('SELECT id,client_name,status,updated_at FROM proposals ORDER BY updated_at DESC LIMIT 50'); res.json(result.rows.map(r => ({ id:r.id,clientName:r.client_name,status:r.status,updatedAt:r.updated_at }))); } catch(error) { next(error); } });
app.get('/api/proposals/:id', async (req,res,next) => { try { const proposal=await getProposal(pool,req.params.id); if(!proposal) return res.status(404).json({message:'Proposal not found.'});res.json(proposal); } catch(error) { next(error); } });
app.post('/api/proposals', async (req,res,next) => { try { const proposal=await createProposal(req.body);res.status(201).json(proposal); } catch(error) { next(error); } });
app.put('/api/proposals/:id', async (req,res,next) => { try { const proposal=await updateProposal(req.params.id,req.body);if(!proposal) return res.status(404).json({message:'Proposal not found.'});res.json(proposal); } catch(error) { next(error); } });
app.post('/api/estimates/generate', (req,res) => res.json(generateEstimate(req.body)));
app.use((error,_req,res,_next) => { console.error(error); res.status(error.status || 500).json({ message: error.status ? error.message : 'An unexpected server error occurred.' }); });
const port=Number(process.env.PORT || 3001);app.listen(port,()=>console.log(`ProposalPilot API listening on http://localhost:${port}`));
