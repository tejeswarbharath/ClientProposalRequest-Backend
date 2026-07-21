import express from 'express';
import cors from 'cors';
import multer from 'multer';
import 'dotenv/config';
import { pool } from './db.js';
import { addAttachment, createProposal, getAttachment, getProposal, updateProposal } from './repository.js';
import { generateEstimate } from './estimator.js';
import { getCurrentUser, requireAuth, signin, signup } from './auth.js';

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
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.txt', '.csv', '.xls', '.xlsx']);
const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, callback) { const extension=file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase(); callback(allowedExtensions.has(extension) ? null : Object.assign(new Error('Upload a PDF, Word, TXT, CSV, XLS, or XLSX file.'),{status:400}), allowedExtensions.has(extension)); }
});

app.get('/api/health', async (_req,res,next) => { try { await pool.query('SELECT 1'); res.json({ status:'ok' }); } catch(error) { next(error); } });
app.post('/api/auth/signup', async (req,res,next) => { try { res.status(201).json(await signup(req.body)); } catch(error) { next(error); } });
app.post('/api/auth/signin', async (req,res,next) => { try { res.json(await signin(req.body)); } catch(error) { next(error); } });
app.get('/api/auth/me', requireAuth, async (req,res,next) => { try { const user=await getCurrentUser(req.user.sub);if(!user)return res.status(401).json({message:'Account not found.'});res.json({user}); } catch(error) { next(error); } });

app.use('/api/proposals', requireAuth);
app.use('/api/estimates', requireAuth);
app.get('/api/proposals', async (req,res,next) => { try { const result = await pool.query('SELECT p.id,p.client_name,p.status,p.planned_team_size,p.updated_at,COUNT(a.id)::int AS attachment_count FROM proposals p LEFT JOIN proposal_attachments a ON a.proposal_id=p.id WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 50',[req.user.sub]); res.json(result.rows.map(r => ({ id:r.id,clientName:r.client_name,status:r.status,teamSize:r.planned_team_size,attachmentCount:r.attachment_count,updatedAt:r.updated_at }))); } catch(error) { next(error); } });
app.get('/api/proposals/:id', async (req,res,next) => { try { const proposal=await getProposal(pool,req.params.id,req.user.sub); if(!proposal) return res.status(404).json({message:'Proposal not found.'});res.json(proposal); } catch(error) { next(error); } });
app.post('/api/proposals', async (req,res,next) => { try { const proposal=await createProposal(req.user.sub,req.body);res.status(201).json(proposal); } catch(error) { next(error); } });
app.put('/api/proposals/:id', async (req,res,next) => { try { const proposal=await updateProposal(req.user.sub,req.params.id,req.body);if(!proposal) return res.status(404).json({message:'Proposal not found.'});res.json(proposal); } catch(error) { next(error); } });
app.post('/api/proposals/:id/attachments', upload.single('file'), async (req,res,next) => { try { if(!req.file) return res.status(400).json({message:'Choose a file to upload.'});const attachment=await addAttachment(req.user.sub,req.params.id,req.file);if(!attachment)return res.status(404).json({message:'Proposal not found.'});res.status(201).json({attachment}); } catch(error) { next(error); } });
app.get('/api/proposals/:id/attachments/:attachmentId/download', async (req,res,next) => { try { const attachment=await getAttachment(req.user.sub,req.params.id,req.params.attachmentId);if(!attachment)return res.status(404).json({message:'Attachment not found.'});res.setHeader('Content-Type',attachment.mime_type);res.setHeader('Content-Disposition',`attachment; filename="${attachment.original_name.replace(/["\\]/g,'_')}"`);res.send(attachment.file_data); } catch(error) { next(error); } });
app.post('/api/estimates/generate', (req,res) => res.json(generateEstimate(req.body)));
app.use((error,_req,res,_next) => { console.error(error); const status=error.status || (error.code==='LIMIT_FILE_SIZE'?413:500); res.status(status).json({ message: error.message || 'An unexpected server error occurred.' }); });
const port=Number(process.env.PORT || 3001);app.listen(port,()=>console.log(`ProposalPilot API listening on http://localhost:${port}`));
