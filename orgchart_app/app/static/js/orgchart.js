async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function loadOrganizations() {
  const orgs = await fetchJSON('/api/organizations');
  const list = document.getElementById('org-list');
  list.innerHTML = '';
  const selector = document.getElementById('org-selector');
  selector.innerHTML = '';
  for (const o of orgs) {
    const div = document.createElement('div');
    div.textContent = `${o.name} ${o.sector ? '(' + o.sector + ')' : ''}`;
    list.appendChild(div);

    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.name;
    selector.appendChild(opt);
  }
  if (orgs.length > 0) {
    selector.value = orgs[0].id;
    await loadProjects(orgs[0].id);
    renderChartFor(orgs[0].id);
  }
}

async function createOrganization(form) {
  const data = Object.fromEntries(new FormData(form));
  await fetchJSON('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await loadOrganizations();
  form.reset();
}

async function uploadCSV(form) {
  const fd = new FormData(form);
  const res = await fetch('/api/imports/people-csv', { method: 'POST', body: fd });
  if (!res.ok) { alert('Upload failed'); return; }
  const j = await res.json();
  alert(`Imported ${j.created.length}, errors ${j.errors.length}`);
}

async function renderChartFor(orgId) {
  const projectId = document.getElementById('project-selector').value || '';
  const q = projectId ? `?project_id=${projectId}` : '';
  const data = await fetchJSON(`/api/orgchart/${orgId}${q}`);
  drawChart(data.tree);
}

function drawChart(roots) {
  const container = document.getElementById('chart');
  container.innerHTML = '';

  const width = container.clientWidth;
  const height = container.clientHeight;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const root = { name: 'ROOT', children: roots };
  const hierarchy = d3.hierarchy(root);

  const treeLayout = d3.tree().size([height - 40, width - 160]);
  treeLayout(hierarchy);

  const g = svg.append('g').attr('transform', 'translate(80,20)');

  // links
  g.selectAll('.link')
    .data(hierarchy.links().slice(1)) // skip artificial root links
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  // nodes
  const node = g.selectAll('.node')
    .data(hierarchy.descendants().slice(1)) // skip artificial root
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y - 60},${d.x - 12})`);

  node.append('rect')
    .attr('width', 120)
    .attr('height', 32)
    .attr('rx', 6).attr('ry', 6)
    .attr('fill', d => (d.data.is_epc_contact ? '#fff7ed' : undefined))
    .attr('stroke', d => (d.data.is_epc_contact ? '#fb923c' : undefined))
    .attr('stroke-width', d => (d.data.is_epc_contact ? 2 : undefined));

  node.append('text')
    .attr('x', 8)
    .attr('y', 14)
    .text(d => d.data.name);

  node.append('text')
    .attr('x', 8)
    .attr('y', 26)
    .attr('fill', '#6b7280')
    .text(d => d.data.title || '');
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('org-form').addEventListener('submit', (e) => {
    e.preventDefault();
    createOrganization(e.target);
  });
  document.getElementById('csv-form').addEventListener('submit', (e) => {
    e.preventDefault();
    uploadCSV(e.target);
  });
  document.getElementById('org-selector').addEventListener('change', (e) => {
    loadProjects(e.target.value).then(() => renderChartFor(e.target.value));
  });
  document.getElementById('project-selector').addEventListener('change', (e) => {
    const orgId = document.getElementById('org-selector').value;
    renderChartFor(orgId);
  });
  loadOrganizations();
});

async function loadProjects(orgId) {
  const projects = await fetchJSON(`/api/projects?organization_id=${orgId}`);
  const sel = document.getElementById('project-selector');
  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All';
  sel.appendChild(all);
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} ${p.status ? '('+p.status+')' : ''}`;
    sel.appendChild(opt);
  }
}
