const baseModules = [
  ['Discovery & solution design', 'Discovery', 13, 1, 0, 0],
  ['Identity & customer portal', 'Build', 34, 2, 1, 0],
  ['Claims & document workflow', 'Build', 55, 3, 2, 1],
  ['Salesforce integration', 'Integration', 21, 2, 1, 0],
  ['Operations dashboard & reporting', 'Build', 34, 2, 1, 0],
  ['Security, UAT & production release', 'QA only', 21, 1, 2, 1]
];

function weeks(points, developmentPeople, qaPeople, performancePeople) {
  const weeklyCapacity = Math.max(1, developmentPeople * 4 + qaPeople + performancePeople);
  return Math.max(1, Math.ceil(points / weeklyCapacity));
}

export function generateEstimate({ proposalRequest = '', plannedTeamSize = 10 }) {
  const request = proposalRequest.toLowerCase();
  const qaOnly = /only qa|testing only|qa effort only/.test(request);
  const teamSize = Math.max(1, Number(plannedTeamSize) || 10);
  if (qaOnly) {
    const modules = [
      ['Test strategy & planning', 'QA only', 8, 0, 1, 0],
      ['Functional & regression testing', 'QA only', 34, 0, 2, 0],
      ['Performance validation', 'QA only', 13, 0, 1, 1],
      ['UAT & production assurance', 'QA only', 13, 0, 2, 0]
    ].map(([title, moduleType, storyPoints, developmentPeople, qaPeople, performancePeople], index) => ({
      title, moduleType, storyPoints, developmentPeople, qaPeople, performancePeople,
      estimatedWeeks: weeks(storyPoints, developmentPeople, qaPeople, performancePeople), sortOrder: index
    }));
    return { modules, roles: { 'Quality Assurance': 3, 'Performance Tester': 1, 'Business Analyst': 1 } };
  }
  const roles = {
    'Solution Architect': 1,
    'Cloud Architect': 1,
    'Backend Developer': Math.max(2, Math.round(teamSize * 0.34)),
    'Frontend Developer': Math.max(1, Math.round(teamSize * 0.17)),
    'Quality Assurance': Math.max(1, Math.round(teamSize * 0.17)),
    'Performance Tester': 1,
    'DevOps Engineer': 1
  };
  if (/data|report|dashboard/.test(request)) roles['Business Analyst'] = 1;
  const modules = baseModules.map(([title, moduleType, storyPoints, developmentPeople, qaPeople, performancePeople], index) => ({
    title, moduleType, storyPoints, developmentPeople, qaPeople, performancePeople,
    estimatedWeeks: weeks(storyPoints, developmentPeople, qaPeople, performancePeople), sortOrder: index
  }));
  return { modules, roles };
}
