import { state } from '../state.js';

export async function renderDashboard(view) {
  const k = state.cache;
  view.innerHTML = `
    <div class="panel">
      <h2>Dashboard</h2>
      <p class="muted">Visão geral rápida do ambiente.</p>
      <div class="grid">
        <div class="panel"><div class="muted">Equipamentos</div><div class="kpi">${k.equipamentos.length}</div></div>
        <div class="panel"><div class="muted">Obras</div><div class="kpi">${k.obras.length}</div></div>
        <div class="panel"><div class="muted">Vínculos</div><div class="kpi">${k.vinculos.length}</div></div>
        <div class="panel"><div class="muted">Medições</div><div class="kpi">${k.medicoes.length}</div></div>
      </div>
    </div>`;
}
