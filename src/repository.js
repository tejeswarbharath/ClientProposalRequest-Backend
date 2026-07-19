import { withTransaction } from './db.js';

const technologies = ['React / Next.js', 'Angular', 'Node.js', 'Java / Spring', 'Python', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'GitHub Actions', 'Azure DevOps', 'AWS', 'Azure'];

function normalizeProposal(input) {
  const p = input || {};
  if (!String(p.clientName || '').trim()) throw Object.assign(new Error('Client name is required.'), { status: 400 });
  if (p.relationship === 'existing' && !String(p.sharepoint || '').trim()) throw Object.assign(new Error('A SharePoint URL is required for an existing client.'), { status: 400 });
  return {
    clientName: String(p.clientName).trim(), budget: Number(p.budget || 0), teamSize: Math.max(1, Number(p.teamSize || 1)),
    startDate: p.startDate || null, endDate: p.endDate || null, relationship: p.relationship === 'existing' ? 'existing' : 'new',
    request: String(p.request || ''), backendStory: String(p.backendStory || ''), sharepoint: p.sharepoint || null,
    status: p.status === 'generated' ? 'generated' : 'draft', selectedStack: (p.selectedStack || []).filter(t => technologies.includes(t)),
    modules: Array.isArray(p.modules) ? p.modules : [], roles: p.roles || {}
  };
}

async function replaceChildren(client, id, data) {
  await client.query('DELETE FROM proposal_technologies WHERE proposal_id=$1', [id]);
  await client.query('DELETE FROM proposal_modules WHERE proposal_id=$1', [id]);
  await client.query('DELETE FROM proposal_roles WHERE proposal_id=$1', [id]);
  for (const technology of data.selectedStack) await client.query('INSERT INTO proposal_technologies(proposal_id,technology) VALUES($1,$2)', [id, technology]);
  for (const [index, m] of data.modules.entries()) await client.query(
    'INSERT INTO proposal_modules(proposal_id,title,module_type,story_points,development_people,qa_people,performance_people,estimated_weeks,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, m.name || m.title || 'Untitled module', m.type || m.moduleType || 'Build', Math.max(1, Number(m.points || m.storyPoints || 1)), Math.max(0, Number(m.dev || m.developmentPeople || 0)), Math.max(0, Number(m.qa || m.qaPeople || 0)), Math.max(0, Number(m.perf || m.performancePeople || 0)), Math.max(1, Number(m.estimatedWeeks || 1)), index]
  );
  for (const [role, count] of Object.entries(data.roles)) await client.query('INSERT INTO proposal_roles(proposal_id,role_name,people_count) VALUES($1,$2,$3)', [id, role, Math.max(0, Number(count || 0))]);
}

export async function getProposal(client, id) {
  const proposal = (await client.query('SELECT * FROM proposals WHERE id=$1', [id])).rows[0];
  if (!proposal) return null;
  const [stack, modules, roles] = await Promise.all([
    client.query('SELECT technology FROM proposal_technologies WHERE proposal_id=$1 ORDER BY technology', [id]),
    client.query('SELECT * FROM proposal_modules WHERE proposal_id=$1 ORDER BY sort_order', [id]),
    client.query('SELECT role_name,people_count FROM proposal_roles WHERE proposal_id=$1 ORDER BY role_name', [id])
  ]);
  return { id: proposal.id, clientName: proposal.client_name, budget: Number(proposal.budget), teamSize: proposal.planned_team_size, startDate: proposal.start_date, endDate: proposal.end_date, relationship: proposal.client_relationship, request: proposal.proposal_request, backendStory: proposal.backend_story, sharepoint: proposal.sharepoint_url, status: proposal.status, selectedStack: stack.rows.map(row => row.technology), modules: modules.rows.map(m => ({ id: m.id, name: m.title, type: m.module_type, points: m.story_points, dev: m.development_people, qa: m.qa_people, perf: m.performance_people, estimatedWeeks: m.estimated_weeks })), roles: Object.fromEntries(roles.rows.map(r => [r.role_name, r.people_count])), createdAt: proposal.created_at, updatedAt: proposal.updated_at };
}

export async function createProposal(input) { const data = normalizeProposal(input); return withTransaction(async client => { const row = (await client.query('INSERT INTO proposals(client_name,budget,planned_team_size,start_date,end_date,client_relationship,proposal_request,backend_story,sharepoint_url,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [data.clientName,data.budget,data.teamSize,data.startDate,data.endDate,data.relationship,data.request,data.backendStory,data.sharepoint,data.status])).rows[0]; await replaceChildren(client,row.id,data); return getProposal(client,row.id); }); }
export async function updateProposal(id, input) { const data = normalizeProposal(input); return withTransaction(async client => { const result = await client.query('UPDATE proposals SET client_name=$2,budget=$3,planned_team_size=$4,start_date=$5,end_date=$6,client_relationship=$7,proposal_request=$8,backend_story=$9,sharepoint_url=$10,status=$11,updated_at=NOW() WHERE id=$1 RETURNING id',[id,data.clientName,data.budget,data.teamSize,data.startDate,data.endDate,data.relationship,data.request,data.backendStory,data.sharepoint,data.status]); if(!result.rowCount) return null; await replaceChildren(client,id,data); return getProposal(client,id); }); }
