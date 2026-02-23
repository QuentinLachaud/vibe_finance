import{u as I,c as U,r as y,j as a,n as q,f as _}from"./index-ChF4BCiq.js";import{r as W,f as C,p as O}from"./simulationEngine-DmQAKyWZ.js";const j=500,B=12,S="#8b5cf6",k="#10b981",F="#22d3ee";function G(o){switch(o){case"one-off":return"One-off";case"recurring-deposit":return"Deposit";case"recurring-withdrawal":return"Withdrawal";default:return o}}function A(o,d){const e=URL.createObjectURL(o),s=document.createElement("a");s.href=e,s.download=d,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(e)}function K(o,d){const e=O(o),s=O(d),l=(s.year-e.year)*12+(s.month-e.month);return{years:Math.floor(l/12),months:l%12}}function Y(o,d){const e=[];return o>0&&e.push(`${o} year${o!==1?"s":""}`),d>0&&e.push(`${d} month${d!==1?"s":""}`),e.join(", ")||"0 months"}function Z(o,d=30){if(!o.length)return[];const e=o[0],s=o[o.length-1];if(e===s)return[{lo:e,hi:s,count:o.length}];const l=(s-e)/d,n=Array.from({length:d},(h,p)=>({lo:e+p*l,hi:e+(p+1)*l,count:0}));for(const h of o){let p=Math.min(Math.floor((h-e)/l),d-1);p<0&&(p=0),n[p].count++}return n}function T(o,d){if(!o.length)return 0;const e=d/100*(o.length-1),s=Math.floor(e),l=Math.ceil(e);return s===l?o[s]:o[s]+(o[l]-o[s])*(e-s)}function J(o,d,e){const s=o.cashFlows.filter(r=>r.type==="recurring-deposit"&&r.enabled),l=o.cashFlows.filter(r=>r.type==="recurring-withdrawal"&&r.enabled),n=o.cashFlows.filter(r=>r.type==="one-off"&&r.enabled),h=o.cashFlows.filter(r=>r.enabled).map(r=>r.startDate).sort()[0]||"",p=o.simulationEnd||"",g=h&&p?K(h,p):null,$=d.survivalRate,v=100-$;let m=`<p>This scenario begins with a portfolio valued at <strong>${e(o.startingBalance)}</strong>`;if(g&&(m+=` and spans <strong>${Y(g.years,g.months)}</strong>`),m+=".</p>",s.length>0||n.length>0){m+='<p class="narrative-section"><strong>Accumulation</strong> — ';const r=[];for(const c of s)r.push(`a ${c.frequency||"monthly"} deposit of ${e(c.amount)} ("${c.label||"Unnamed"}")`);for(const c of n)c.amount>0&&r.push(`a one-off injection of ${e(c.amount)} in ${C(c.startDate)}`);m+=r.length?`The plan includes ${r.join("; ")}.`:"No regular contributions are scheduled.",m+="</p>"}if(l.length>0){m+='<p class="narrative-section"><strong>Decumulation</strong> — ';const r=[];for(const c of l)r.push(`a ${c.frequency||"monthly"} withdrawal of ${e(c.amount)} ("${c.label||"Unnamed"}")`);m+=r.join("; ")+".</p>"}const t=o.cashFlows.filter(r=>r.enabled).reduce((r,c)=>r+c.growthRate,0)/Math.max(1,o.cashFlows.filter(r=>r.enabled).length);return m+=`<p class="narrative-section"><strong>Growth Assumption</strong> — Cash flows assume a weighted-average annual growth rate of approximately <strong>${t.toFixed(1)}%</strong>, with annual volatility of <strong>${B}%</strong>.</p>`,m+=`<p class="narrative-section"><strong>Simulation</strong> — ${j.toLocaleString()} independent Monte Carlo paths were modelled. `,$===100?m+="All simulated paths survived with a positive balance at the end of the horizon.":v<=5?m+=`${$}% of paths survived (${v}% ran to zero before the end).`:m+=`Only <strong>${$}%</strong> of paths survived — <strong>${v}%</strong> depleted the portfolio before the horizon ended. Consider reducing withdrawals or extending the growth period.`,m+="</p>",m}function Q(o,d){const e=o.timeSteps;if(e.length<2)return"";const s=760,l=300,n=70,h=20,p=20,g=40,$=s-n-h,v=l-p-g,m=Math.max(...e.map(i=>i.p90))||1,t=Math.min(0,...e.map(i=>i.p10)),r=m-t||1,c=i=>n+i/(e.length-1)*$,b=i=>p+v-(i-t)/r*v,w=i=>e.map((x,u)=>`${u===0?"M":"L"}${c(u).toFixed(1)},${b(x[i]).toFixed(1)}`).join(" "),z=e.map((i,x)=>`${x===0?"M":"L"}${c(x).toFixed(1)},${b(i.p90).toFixed(1)}`).join(" ")+" "+[...e].reverse().map((i,x)=>`L${c(e.length-1-x).toFixed(1)},${b(i.p10).toFixed(1)}`).join(" ")+" Z",L=e.map((i,x)=>`${x===0?"M":"L"}${c(x).toFixed(1)},${b(i.p75).toFixed(1)}`).join(" ")+" "+[...e].reverse().map((i,x)=>`L${c(e.length-1-x).toFixed(1)},${b(i.p25).toFixed(1)}`).join(" ")+" Z",R=Math.max(1,Math.floor(e.length/6)),D=e.filter((i,x)=>x%R===0||x===e.length-1).map(i=>{const x=e.indexOf(i);return`<text x="${c(x).toFixed(1)}" y="${l-5}" fill="#71717a" font-size="10" text-anchor="middle">${i.label}</text>`}).join(""),N=5,f=Array.from({length:N+1},(i,x)=>{const u=t+r*x/N,M=u>=1e6?`${(u/1e6).toFixed(1)}M`:u>=1e3?`${(u/1e3).toFixed(0)}K`:String(Math.round(u));return`<text x="${n-8}" y="${b(u).toFixed(1)}" fill="#71717a" font-size="10" text-anchor="end" dominant-baseline="middle">${M}</text>
    <line x1="${n}" y1="${b(u).toFixed(1)}" x2="${s-h}" y2="${b(u).toFixed(1)}" stroke="#2a2a35" stroke-dasharray="3,3"/>`}).join("");return`
    <svg viewBox="0 0 ${s} ${l}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      ${f}
      <path d="${z}" fill="${S}" fill-opacity="0.18"/>
      <path d="${L}" fill="${k}" fill-opacity="0.22"/>
      <path d="${w("median")}" fill="none" stroke="${F}" stroke-width="2.5"/>
      ${D}
      <!-- Legend -->
      <rect x="${n}" y="${p-14}" width="10" height="10" rx="2" fill="${S}" fill-opacity="0.35"/>
      <text x="${n+14}" y="${p-5}" fill="#a1a1aa" font-size="9">10th–90th</text>
      <rect x="${n+80}" y="${p-14}" width="10" height="10" rx="2" fill="${k}" fill-opacity="0.45"/>
      <text x="${n+94}" y="${p-5}" fill="#a1a1aa" font-size="9">25th–75th</text>
      <line x1="${n+165}" y1="${p-9}" x2="${n+180}" y2="${p-9}" stroke="${F}" stroke-width="2"/>
      <text x="${n+184}" y="${p-5}" fill="#a1a1aa" font-size="9">Median</text>
    </svg>
  `}function X(o,d){const e=o.finalDistribution;if(!e.length)return"";const s=Z(e,30);if(!s.length)return"";const l=760,n=240,h=70,p=20,g=20,$=40,v=l-h-p,m=n-g-$,t=Math.max(...s.map(f=>f.count))||1,r=v/s.length,c=T(e,25),b=T(e,50),w=T(e,75),z=s.map((f,i)=>{const x=h+i*r,u=f.count/t*m,M=g+m-u,P=(f.lo+f.hi)/2,V=P>=c&&P<=w?k:S,H=P>=c&&P<=w?"0.5":"0.3";return`<rect x="${x.toFixed(1)}" y="${M.toFixed(1)}" width="${Math.max(1,r-1).toFixed(1)}" height="${u.toFixed(1)}" fill="${V}" fill-opacity="${H}" rx="1"/>`}).join(""),L=f=>{const i=s[0].lo,x=s[s.length-1].hi;return h+(f-i)/(x-i)*v},R=[{v:c,label:"25th",color:"#eab308"},{v:b,label:"Median",color:F},{v:w,label:"75th",color:k}].map(f=>{const i=L(f.v);return`<line x1="${i.toFixed(1)}" y1="${g}" x2="${i.toFixed(1)}" y2="${g+m}" stroke="${f.color}" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${i.toFixed(1)}" y="${g-4}" fill="${f.color}" font-size="9" text-anchor="middle">${f.label}</text>`}).join(""),D=Math.max(1,Math.floor(s.length/5)),N=s.filter((f,i)=>i%D===0||i===s.length-1).map(f=>{const i=s.indexOf(f),x=h+(i+.5)*r,u=(f.lo+f.hi)/2,M=u>=1e6?`${(u/1e6).toFixed(1)}M`:u>=1e3?`${(u/1e3).toFixed(0)}K`:String(Math.round(u));return`<text x="${x.toFixed(1)}" y="${n-5}" fill="#71717a" font-size="9" text-anchor="middle">${M}</text>`}).join("");return`
    <svg viewBox="0 0 ${l} ${n}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      <line x1="${h}" y1="${g+m}" x2="${l-p}" y2="${g+m}" stroke="#2a2a35"/>
      ${z}
      ${R}
      ${N}
    </svg>
  `}function ee(o,d){const e=[];for(const{scenario:s,result:l}of o){e.push(`Scenario: ${s.name}`),e.push(`Starting Balance,${s.startingBalance}`),e.push(`Simulation End,${s.simulationEnd}`),e.push(`Simulations,${j}`),e.push(`Survival Rate,${l.survivalRate}%`),e.push(""),e.push("Cash Flows"),e.push("Label,Type,Amount,Growth %,Start,End,Frequency");for(const n of s.cashFlows)e.push([`"${n.label}"`,G(n.type),n.amount,n.growthRate,n.startDate,n.endDate||"",n.frequency||""].join(","));e.push(""),e.push("Results Summary"),e.push(`Median (Expected),${l.finalMedian}`),e.push(`Optimistic (75th),${l.finalP75}`),e.push(`Pessimistic (25th),${l.finalP25}`),e.push(`Best Case (90th),${l.finalP90}`),e.push(`Worst Case (10th),${l.finalP10}`),e.push(""),e.push("Time Series"),e.push("Period,10th,25th,Median,75th,90th");for(const n of l.timeSteps)e.push(`${n.label},${n.p10},${n.p25},${n.median},${n.p75},${n.p90}`);e.push(""),e.push("---"),e.push("")}return e.join(`
`)}function E(o,d){const e=n=>_(n,d),s=new Date().toLocaleDateString("en-GB",{year:"numeric",month:"long",day:"numeric"});let l="";for(const{scenario:n,result:h}of o){const p=J(n,h,e),g=n.cashFlows.filter(t=>t.enabled).map(t=>`
      <tr>
        <td>${t.label||"—"}</td>
        <td><span class="tag tag-${t.type==="recurring-deposit"?"deposit":t.type==="recurring-withdrawal"?"withdrawal":"oneoff"}">${G(t.type)}</span></td>
        <td class="num">${e(t.amount)}</td>
        <td class="num">${t.growthRate}%</td>
        <td>${C(t.startDate)}</td>
        <td>${t.endDate?C(t.endDate):"—"}</td>
        <td>${t.frequency==="annually"?"Annually":t.frequency==="monthly"?"Monthly":"—"}</td>
      </tr>`).join(""),$=h.timeSteps.filter((t,r)=>r===0||r===h.timeSteps.length-1||r%Math.max(1,Math.floor(h.timeSteps.length/8))===0).map(t=>`
        <tr>
          <td>${t.label}</td>
          <td class="num">${e(t.p10)}</td>
          <td class="num">${e(t.p25)}</td>
          <td class="num median-col">${e(t.median)}</td>
          <td class="num">${e(t.p75)}</td>
          <td class="num">${e(t.p90)}</td>
        </tr>`).join(""),v=Q(h),m=X(h);l+=`
      <!-- ═══════════════ SCENARIO ═══════════════ -->
      <section class="scenario-block">
        <div class="scenario-header">
          <h2>${n.name}</h2>
        </div>

        <!-- Page 1: Executive Summary -->
        <div class="page-section">
          <div class="section-badge">Overview</div>
          <div class="narrative">${p}</div>

          <div class="kpi-row">
            <div class="kpi kpi-accent">
              <div class="kpi-value" style="color:${F}">${e(h.finalMedian)}</div>
              <div class="kpi-label">Median (Expected)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:${k}">${e(h.finalP75)}</div>
              <div class="kpi-label">Optimistic (75th)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:#eab308">${e(h.finalP25)}</div>
              <div class="kpi-label">Pessimistic (25th)</div>
            </div>
          </div>

          <div class="kpi-row kpi-row-secondary">
            <div class="kpi-sm">
              <span class="kpi-sm-label">Starting Value</span>
              <span class="kpi-sm-value">${e(n.startingBalance)}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Simulations</span>
              <span class="kpi-sm-value">${j.toLocaleString()}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Survived</span>
              <span class="kpi-sm-value">${h.survivalRate}%</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Depleted</span>
              <span class="kpi-sm-value">${100-h.survivalRate}%</span>
            </div>
          </div>
        </div>

        <!-- Page 2: Monte Carlo Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Projected Growth</div>
          <p class="section-explainer">The chart below shows the range of possible portfolio outcomes over time. The shaded bands represent the probability corridors — the wider violet band covers 80% of outcomes (10th to 90th percentile), while the narrower green band covers the middle 50% (25th to 75th). The cyan line marks the median path.</p>
          ${v}
        </div>

        <!-- Page 3: Distribution Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Outcome Distribution</div>
          <p class="section-explainer">This histogram shows how final portfolio values are distributed across all ${j} simulations. Each bar represents a range of outcomes — taller bars mean more simulations landed in that range. The dashed lines mark key percentiles.</p>
          ${m}
        </div>

        <!-- Page 4: Cash Flows Breakdown -->
        <div class="page-section page-break">
          <div class="section-badge">Cash Flows</div>
          <p class="section-explainer">The table below lists every cash flow included in this scenario. Deposits add to the portfolio, withdrawals draw down from it, and one-off events are single transactions at a specific date.</p>
          <table>
            <thead><tr><th>Label</th><th>Type</th><th>Amount</th><th>Growth</th><th>Start</th><th>End</th><th>Frequency</th></tr></thead>
            <tbody>${g}</tbody>
          </table>
        </div>

        <!-- Page 5: Time Series Data -->
        <div class="page-section page-break">
          <div class="section-badge">Projected Values</div>
          <p class="section-explainer">Key milestone values across the simulation horizon. The <em>Median</em> column (highlighted) represents the most likely outcome at each point in time. Outer columns show optimistic and pessimistic scenarios.</p>
          <table class="ts-table">
            <thead>
              <tr>
                <th>Period</th>
                <th style="color:${S}">10th</th>
                <th style="color:#eab308">25th</th>
                <th style="color:${F}">Median</th>
                <th style="color:${k}">75th</th>
                <th style="color:${S}">90th</th>
              </tr>
            </thead>
            <tbody>${$}</tbody>
          </table>
        </div>
      </section>
    `}return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portfolio Simulation Report — Vibe Finance</title>
<style>
  :root {
    --brand: #8b5cf6; --brand-dark: #6d28d9;
    --bg: #0e0e12; --surface: #151519; --surface-2: #1a1a20;
    --border: #252530; --text: #d4d4d8; --text-sec: #a1a1aa; --text-muted: #71717a;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text);
    line-height: 1.65; font-size: 14px;
  }

  /* Header */
  .report-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 36px 48px;
  }
  .report-header .brand {
    font-size: 12px; color: var(--text-muted);
    letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;
  }
  .report-header h1 { font-size: 24px; font-weight: 700; color: #fff; }
  .report-header .date { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

  .content { max-width: 860px; margin: 0 auto; padding: 36px 28px 72px; }

  /* Scenario blocks */
  .scenario-block { margin-bottom: 56px; }
  .scenario-header { margin-bottom: 24px; border-bottom: 2px solid var(--border); padding-bottom: 12px; }
  .scenario-header h2 { font-size: 20px; font-weight: 700; color: #fff; }

  /* Page sections */
  .page-section { margin-bottom: 36px; }
  .page-break { page-break-before: auto; }
  .section-badge {
    display: inline-block;
    font-size: 10px; font-weight: 700; color: var(--brand);
    text-transform: uppercase; letter-spacing: 1.2px;
    border: 1px solid var(--brand); border-radius: 4px;
    padding: 2px 10px; margin-bottom: 12px;
  }
  .section-explainer {
    font-size: 13px; color: var(--text-sec);
    line-height: 1.7; margin-bottom: 16px;
    max-width: 720px;
  }

  /* Narrative */
  .narrative { margin-bottom: 24px; }
  .narrative p { font-size: 13.5px; color: var(--text-sec); margin-bottom: 10px; line-height: 1.7; }
  .narrative strong { color: #fff; font-weight: 600; }

  /* KPI cards */
  .kpi-row { display: flex; gap: 14px; margin-bottom: 14px; }
  .kpi {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 18px 16px; text-align: center;
  }
  .kpi-accent { border-color: rgba(34,211,238,0.25); background: rgba(34,211,238,0.04); }
  .kpi-value { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
  .kpi-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

  .kpi-row-secondary { gap: 10px; }
  .kpi-sm {
    flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 12px; text-align: center;
    display: flex; flex-direction: column; gap: 2px;
  }
  .kpi-sm-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-sm-value { font-size: 14px; font-weight: 700; color: var(--text); }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
  thead { background: var(--surface-2); }
  th {
    padding: 8px 10px; text-align: left; color: var(--text-muted);
    font-weight: 600; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.5px; border-bottom: 1px solid var(--border);
  }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--text); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.median-col { color: ${F}; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: rgba(255,255,255,0.015); }

  /* Tags */
  .tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: inline-block; }
  .tag-deposit { background: rgba(16,185,129,0.12); color: ${k}; }
  .tag-withdrawal { background: rgba(234,179,8,0.12); color: #eab308; }
  .tag-oneoff { background: rgba(139,92,246,0.12); color: ${S}; }

  .ts-table thead th:first-child { min-width: 90px; }

  /* Footer */
  .report-footer {
    text-align: center; padding: 20px; font-size: 11px;
    color: var(--text-muted); border-top: 1px solid var(--border); margin-top: 40px;
  }

  /* Print */
  @media print {
    body { background: #fff; color: #222; font-size: 11pt; }
    :root { --surface: #f7f7f8; --surface-2: #f0f0f2; --border: #ddd; --text: #222; --text-sec: #555; --text-muted: #888; --brand: #6d28d9; --bg: #fff; }
    .report-header { background: var(--surface); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi, .kpi-sm { break-inside: avoid; }
    .page-break { page-break-before: always; }
    .scenario-block { break-inside: avoid; }
    svg { max-width: 100%; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">Vibe Finance</div>
    <h1>Portfolio Simulation Report</h1>
    <div class="date">Generated ${s}</div>
  </div>
  <div class="content">
    ${l}
  </div>
  <div class="report-footer">
    Vibe Finance &middot; Monte Carlo Portfolio Simulator &middot; ${o.length} scenario${o.length!==1?"s":""} &middot; ${j.toLocaleString()} simulations each
  </div>
</body>
</html>`}function oe(){const{currency:o}=I(),[d]=U("vf-ps-scenarios",[]),[e,s]=y.useState(new Set),[l,n]=y.useState(!1),[h,p]=y.useState(!1),g=y.useCallback(t=>{s(r=>{const c=new Set(r);return c.has(t)?c.delete(t):c.add(t),c})},[]),$=y.useCallback(()=>{e.size===d.length?s(new Set):s(new Set(d.map(t=>t.id)))},[e.size,d]),v=y.useMemo(()=>d.filter(t=>e.has(t.id)),[d,e]),m=y.useCallback(t=>{v.length&&(n(!0),p(!1),setTimeout(()=>{try{const r=v.map(b=>({scenario:b,result:W({startingBalance:b.startingBalance,cashFlows:b.cashFlows,volatility:B,numPaths:j,endOverride:b.simulationEnd||void 0})})),c=new Date().toISOString().slice(0,10);if(t==="csv")A(new Blob([ee(r,o.code)],{type:"text/csv"}),`vibe-finance-report-${c}.csv`);else if(t==="html")A(new Blob([E(r,o.code)],{type:"text/html"}),`vibe-finance-report-${c}.html`);else if(t==="pdf"){const b=E(r,o.code),w=window.open("","_blank");w&&(w.document.write(b),w.document.close(),setTimeout(()=>w.print(),500))}}catch(r){console.error("Report generation failed",r)}n(!1)},100))},[v,o.code]);return a.jsx("div",{className:"page-container",children:a.jsxs("div",{className:"ps-page",children:[a.jsx("h1",{className:"ps-page-title",children:"Reports"}),l&&a.jsx(q,{text:"Generating report…"}),a.jsxs("div",{className:"ps-card rp-card",children:[a.jsx("div",{className:"rp-card-header",children:a.jsx("h2",{className:"ps-card-title",children:"Select Scenarios"})}),d.length===0&&a.jsx("p",{style:{color:"var(--text-muted)",padding:"16px 0"},children:"No saved scenarios found. Go to the Portfolio Simulator to create and save scenarios."}),d.length>0&&a.jsxs(a.Fragment,{children:[a.jsxs("table",{className:"rp-table",children:[a.jsx("thead",{children:a.jsxs("tr",{children:[a.jsx("th",{className:"rp-th-check",children:a.jsx("label",{className:"rp-check-label",children:a.jsx("input",{type:"checkbox",checked:e.size===d.length&&d.length>0,onChange:$})})}),a.jsx("th",{children:"Scenario"}),a.jsx("th",{children:"Starting Balance"}),a.jsx("th",{children:"Cash Flows"}),a.jsx("th",{children:"Horizon"})]})}),a.jsx("tbody",{children:d.map(t=>a.jsxs("tr",{className:e.has(t.id)?"rp-row-selected":"",children:[a.jsx("td",{className:"rp-td-check",children:a.jsx("label",{className:"rp-check-label",children:a.jsx("input",{type:"checkbox",checked:e.has(t.id),onChange:()=>g(t.id)})})}),a.jsx("td",{className:"rp-td-name",children:t.name}),a.jsx("td",{className:"rp-td-num",children:_(t.startingBalance,o.code)}),a.jsx("td",{className:"rp-td-num",children:t.cashFlows.length}),a.jsx("td",{children:t.simulationEnd?C(t.simulationEnd):"Auto"})]},t.id))})]}),a.jsxs("div",{className:"rp-actions",children:[a.jsxs("span",{className:"rp-selected-count",children:[e.size," selected"]}),a.jsx("button",{className:"ps-btn ps-btn--primary",disabled:e.size===0||l,onClick:()=>p(!0),children:"Generate Report"})]})]})]}),h&&a.jsx("div",{className:"ps-modal-backdrop",onClick:()=>p(!1),children:a.jsxs("div",{className:"rp-format-picker",onClick:t=>t.stopPropagation(),children:[a.jsx("h3",{className:"rp-format-title",children:"Choose Report Format"}),a.jsxs("div",{className:"rp-format-options",children:[a.jsxs("button",{className:"rp-format-btn",onClick:()=>m("html"),children:[a.jsx("span",{className:"rp-format-icon",children:"🌐"}),a.jsxs("div",{children:[a.jsx("span",{className:"rp-format-label",children:"HTML"}),a.jsx("span",{className:"rp-format-desc",children:"Rich styled report, viewable in any browser"})]})]}),a.jsxs("button",{className:"rp-format-btn",onClick:()=>m("pdf"),children:[a.jsx("span",{className:"rp-format-icon",children:"📄"}),a.jsxs("div",{children:[a.jsx("span",{className:"rp-format-label",children:"PDF"}),a.jsx("span",{className:"rp-format-desc",children:"Print-ready via browser print dialog"})]})]}),a.jsxs("button",{className:"rp-format-btn",onClick:()=>m("csv"),children:[a.jsx("span",{className:"rp-format-icon",children:"📊"}),a.jsxs("div",{children:[a.jsx("span",{className:"rp-format-label",children:"CSV"}),a.jsx("span",{className:"rp-format-desc",children:"Opens in Excel, Google Sheets, etc."})]})]})]}),a.jsx("button",{className:"rp-format-cancel",onClick:()=>p(!1),children:"Cancel"})]})})]})})}export{oe as ReportsPage};
