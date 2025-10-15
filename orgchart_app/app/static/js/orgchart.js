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

async function searchContacts(form) {
  const resultsDiv = document.getElementById('scraper-results');
  resultsDiv.innerHTML = '<p style="color: #666;">⏳ Searching for contacts... This may take a few seconds.</p>';
  
  const data = Object.fromEntries(new FormData(form));
  
  try {
    const response = await fetch('/api/scraper/search-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: data.url,
        max_pages: parseInt(data.max_pages) || 3
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      if (result.prohibited) {
        resultsDiv.innerHTML = `<p style="color: #dc2626;">❌ ${result.error}</p>`;
      } else {
        resultsDiv.innerHTML = `<p style="color: #dc2626;">Error: ${result.error}</p>`;
      }
      return;
    }
    
    if (result.contacts && result.contacts.length > 0) {
      let html = `<p style="color: #16a34a;">✅ Found ${result.total_found} contact(s) from ${result.pages_checked} page(s)</p>`;
      html += '<div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-top: 10px;">';
      
      result.contacts.forEach((contact, index) => {
        html += `
          <div style="padding: 10px; margin-bottom: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #3b82f6;">
            <strong>${contact.name || 'Unknown'}</strong>
            ${contact.title ? `<br><span style="color: #6b7280;">${contact.title}</span>` : ''}
            ${contact.email ? `<br>📧 ${contact.email}` : ''}
            ${contact.phone ? `<br>📞 ${contact.phone}` : ''}
            <br><small style="color: #9ca3af;">Source: ${contact.source_url}</small>
          </div>
        `;
      });
      
      html += '</div>';
      html += '<p style="margin-top: 10px;"><small><em>💡 Tip: You can manually add these contacts to your organizations using the data above.</em></small></p>';
      resultsDiv.innerHTML = html;
    } else {
      resultsDiv.innerHTML = '<p style="color: #f59e0b;">⚠️ No contacts found on this website. Try a different URL or the company\'s "About" or "Team" page.</p>';
    }
    
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: #dc2626;">❌ Error: ${error.message}</p>`;
  }
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
  document.getElementById('scraper-form').addEventListener('submit', (e) => {
    e.preventDefault();
    searchContacts(e.target);
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
