import{b as q,u as W,r as y,d as K,j as t,L as A,m as O,f as G}from"./index-bqMAKIKc.js";import{r as Y,f as D,p as E}from"./simulationEngine-DmQAKyWZ.js";const N=500,V=12,C="#8b5cf6",F="#10b981",M="#22d3ee";function H(a){switch(a){case"one-off":return"One-off";case"recurring-deposit":return"Deposit";case"recurring-withdrawal":return"Withdrawal";default:return a}}function _(a,x){const e=URL.createObjectURL(a),s=document.createElement("a");s.href=e,s.download=x,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(e)}function Z(a,x){const e=E(a),s=E(x),i=(s.year-e.year)*12+(s.month-e.month);return{years:Math.floor(i/12),months:i%12}}function J(a,x){const e=[];return a>0&&e.push(`${a} year${a!==1?"s":""}`),x>0&&e.push(`${x} month${x!==1?"s":""}`),e.join(", ")||"0 months"}function Q(a,x=30){if(!a.length)return[];const e=a[0],s=a[a.length-1];if(e===s)return[{lo:e,hi:s,count:a.length}];const i=(s-e)/x,o=Array.from({length:x},(p,u)=>({lo:e+u*i,hi:e+(u+1)*i,count:0}));for(const p of a){let u=Math.min(Math.floor((p-e)/i),x-1);u<0&&(u=0),o[u].count++}return o}function T(a,x){if(!a.length)return 0;const e=x/100*(a.length-1),s=Math.floor(e),i=Math.ceil(e);return s===i?a[s]:a[s]+(a[i]-a[s])*(e-s)}function X(a,x,e){const s=a.cashFlows.filter(r=>r.type==="recurring-deposit"&&r.enabled),i=a.cashFlows.filter(r=>r.type==="recurring-withdrawal"&&r.enabled),o=a.cashFlows.filter(r=>r.type==="one-off"&&r.enabled),p=a.cashFlows.filter(r=>r.enabled).map(r=>r.startDate).sort()[0]||"",u=a.simulationEnd||"",g=p&&u?Z(p,u):null,$=x.survivalRate,w=100-$;let h=`<p>This scenario begins with a portfolio valued at <strong>${e(a.startingBalance)}</strong>`;if(g&&(h+=` and spans <strong>${J(g.years,g.months)}</strong>`),h+=".</p>",s.length>0||o.length>0){h+='<p class="narrative-section"><strong>Accumulation</strong> — ';const r=[];for(const f of s)r.push(`a ${f.frequency||"monthly"} deposit of ${e(f.amount)} ("${f.label||"Unnamed"}")`);for(const f of o)f.amount>0&&r.push(`a one-off injection of ${e(f.amount)} in ${D(f.startDate)}`);h+=r.length?`The plan includes ${r.join("; ")}.`:"No regular contributions are scheduled.",h+="</p>"}if(i.length>0){h+='<p class="narrative-section"><strong>Decumulation</strong> — ';const r=[];for(const f of i)r.push(`a ${f.frequency||"monthly"} withdrawal of ${e(f.amount)} ("${f.label||"Unnamed"}")`);h+=r.join("; ")+".</p>"}const l=a.cashFlows.filter(r=>r.enabled).reduce((r,f)=>r+f.growthRate,0)/Math.max(1,a.cashFlows.filter(r=>r.enabled).length);return h+=`<p class="narrative-section"><strong>Growth Assumption</strong> — Cash flows assume a weighted-average annual growth rate of approximately <strong>${l.toFixed(1)}%</strong>, with annual volatility of <strong>${V}%</strong>.</p>`,h+=`<p class="narrative-section"><strong>Simulation</strong> — ${N.toLocaleString()} independent Monte Carlo paths were modelled. `,$===100?h+="All simulated paths survived with a positive balance at the end of the horizon.":w<=5?h+=`${$}% of paths survived (${w}% ran to zero before the end).`:h+=`Only <strong>${$}%</strong> of paths survived — <strong>${w}%</strong> depleted the portfolio before the horizon ended. Consider reducing withdrawals or extending the growth period.`,h+="</p>",h}function ee(a,x){const e=a.timeSteps;if(e.length<2)return"";const s=760,i=300,o=70,p=20,u=20,g=40,$=s-o-p,w=i-u-g,h=Math.max(...e.map(n=>n.p90))||1,l=Math.min(0,...e.map(n=>n.p10)),r=h-l||1,f=n=>o+n/(e.length-1)*$,v=n=>u+w-(n-l)/r*w,k=n=>e.map((d,b)=>`${b===0?"M":"L"}${f(b).toFixed(1)},${v(d[n]).toFixed(1)}`).join(" "),P=e.map((n,d)=>`${d===0?"M":"L"}${f(d).toFixed(1)},${v(n.p90).toFixed(1)}`).join(" ")+" "+[...e].reverse().map((n,d)=>`L${f(e.length-1-d).toFixed(1)},${v(n.p10).toFixed(1)}`).join(" ")+" Z",L=e.map((n,d)=>`${d===0?"M":"L"}${f(d).toFixed(1)},${v(n.p75).toFixed(1)}`).join(" ")+" "+[...e].reverse().map((n,d)=>`L${f(e.length-1-d).toFixed(1)},${v(n.p25).toFixed(1)}`).join(" ")+" Z",j=Math.max(1,Math.floor(e.length/6)),S=e.filter((n,d)=>d%j===0||d===e.length-1).map(n=>{const d=e.indexOf(n);return`<text x="${f(d).toFixed(1)}" y="${i-5}" fill="#71717a" font-size="10" text-anchor="middle">${n.label}</text>`}).join(""),c=5,m=Array.from({length:c+1},(n,d)=>{const b=l+r*d/c,z=b>=1e6?`${(b/1e6).toFixed(1)}M`:b>=1e3?`${(b/1e3).toFixed(0)}K`:String(Math.round(b));return`<text x="${o-8}" y="${v(b).toFixed(1)}" fill="#71717a" font-size="10" text-anchor="end" dominant-baseline="middle">${z}</text>
    <line x1="${o}" y1="${v(b).toFixed(1)}" x2="${s-p}" y2="${v(b).toFixed(1)}" stroke="#2a2a35" stroke-dasharray="3,3"/>`}).join("");return`
    <svg viewBox="0 0 ${s} ${i}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      ${m}
      <path d="${P}" fill="${C}" fill-opacity="0.18"/>
      <path d="${L}" fill="${F}" fill-opacity="0.22"/>
      <path d="${k("median")}" fill="none" stroke="${M}" stroke-width="2.5"/>
      ${S}
      <!-- Legend -->
      <rect x="${o}" y="${u-14}" width="10" height="10" rx="2" fill="${C}" fill-opacity="0.35"/>
      <text x="${o+14}" y="${u-5}" fill="#a1a1aa" font-size="9">10th–90th</text>
      <rect x="${o+80}" y="${u-14}" width="10" height="10" rx="2" fill="${F}" fill-opacity="0.45"/>
      <text x="${o+94}" y="${u-5}" fill="#a1a1aa" font-size="9">25th–75th</text>
      <line x1="${o+165}" y1="${u-9}" x2="${o+180}" y2="${u-9}" stroke="${M}" stroke-width="2"/>
      <text x="${o+184}" y="${u-5}" fill="#a1a1aa" font-size="9">Median</text>
    </svg>
  `}function te(a,x){const e=a.finalDistribution;if(!e.length)return"";const s=Q(e,30);if(!s.length)return"";const i=760,o=240,p=70,u=20,g=20,$=40,w=i-p-u,h=o-g-$,l=Math.max(...s.map(m=>m.count))||1,r=w/s.length,f=T(e,25),v=T(e,50),k=T(e,75),P=s.map((m,n)=>{const d=p+n*r,b=m.count/l*h,z=g+h-b,R=(m.lo+m.hi)/2,I=R>=f&&R<=k?F:C,U=R>=f&&R<=k?"0.5":"0.3";return`<rect x="${d.toFixed(1)}" y="${z.toFixed(1)}" width="${Math.max(1,r-1).toFixed(1)}" height="${b.toFixed(1)}" fill="${I}" fill-opacity="${U}" rx="1"/>`}).join(""),L=m=>{const n=s[0].lo,d=s[s.length-1].hi;return p+(m-n)/(d-n)*w},j=[{v:f,label:"25th",color:"#eab308"},{v,label:"Median",color:M},{v:k,label:"75th",color:F}].map(m=>{const n=L(m.v);return`<line x1="${n.toFixed(1)}" y1="${g}" x2="${n.toFixed(1)}" y2="${g+h}" stroke="${m.color}" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${n.toFixed(1)}" y="${g-4}" fill="${m.color}" font-size="9" text-anchor="middle">${m.label}</text>`}).join(""),S=Math.max(1,Math.floor(s.length/5)),c=s.filter((m,n)=>n%S===0||n===s.length-1).map(m=>{const n=s.indexOf(m),d=p+(n+.5)*r,b=(m.lo+m.hi)/2,z=b>=1e6?`${(b/1e6).toFixed(1)}M`:b>=1e3?`${(b/1e3).toFixed(0)}K`:String(Math.round(b));return`<text x="${d.toFixed(1)}" y="${o-5}" fill="#71717a" font-size="9" text-anchor="middle">${z}</text>`}).join("");return`
    <svg viewBox="0 0 ${i} ${o}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:12px 0;">
      <line x1="${p}" y1="${g+h}" x2="${i-u}" y2="${g+h}" stroke="#2a2a35"/>
      ${P}
      ${j}
      ${c}
    </svg>
  `}function ae(a,x){const e=[];for(const{scenario:s,result:i}of a){e.push(`Scenario: ${s.name}`),e.push(`Starting Balance,${s.startingBalance}`),e.push(`Simulation End,${s.simulationEnd}`),e.push(`Simulations,${N}`),e.push(`Survival Rate,${i.survivalRate}%`),e.push(""),e.push("Cash Flows"),e.push("Label,Type,Amount,Growth %,Start,End,Frequency");for(const o of s.cashFlows)e.push([`"${o.label}"`,H(o.type),o.amount,o.growthRate,o.startDate,o.endDate||"",o.frequency||""].join(","));e.push(""),e.push("Results Summary"),e.push(`Median (Expected),${i.finalMedian}`),e.push(`Optimistic (75th),${i.finalP75}`),e.push(`Pessimistic (25th),${i.finalP25}`),e.push(`Best Case (90th),${i.finalP90}`),e.push(`Worst Case (10th),${i.finalP10}`),e.push(""),e.push("Time Series"),e.push("Period,10th,25th,Median,75th,90th");for(const o of i.timeSteps)e.push(`${o.label},${o.p10},${o.p25},${o.median},${o.p75},${o.p90}`);e.push(""),e.push("---"),e.push("")}return e.join(`
`)}function B(a,x){const e=o=>G(o,x),s=new Date().toLocaleDateString("en-GB",{year:"numeric",month:"long",day:"numeric"});let i="";for(const{scenario:o,result:p}of a){const u=X(o,p,e),g=o.cashFlows.filter(l=>l.enabled).map(l=>`
      <tr>
        <td>${l.label||"—"}</td>
        <td><span class="tag tag-${l.type==="recurring-deposit"?"deposit":l.type==="recurring-withdrawal"?"withdrawal":"oneoff"}">${H(l.type)}</span></td>
        <td class="num">${e(l.amount)}</td>
        <td class="num">${l.growthRate}%</td>
        <td>${D(l.startDate)}</td>
        <td>${l.endDate?D(l.endDate):"—"}</td>
        <td>${l.frequency==="annually"?"Annually":l.frequency==="monthly"?"Monthly":"—"}</td>
      </tr>`).join(""),$=p.timeSteps.filter((l,r)=>r===0||r===p.timeSteps.length-1||r%Math.max(1,Math.floor(p.timeSteps.length/8))===0).map(l=>`
        <tr>
          <td>${l.label}</td>
          <td class="num">${e(l.p10)}</td>
          <td class="num">${e(l.p25)}</td>
          <td class="num median-col">${e(l.median)}</td>
          <td class="num">${e(l.p75)}</td>
          <td class="num">${e(l.p90)}</td>
        </tr>`).join(""),w=ee(p),h=te(p);i+=`
      <!-- ═══════════════ SCENARIO ═══════════════ -->
      <section class="scenario-block">
        <div class="scenario-header">
          <h2>${o.name}</h2>
        </div>

        <!-- Page 1: Executive Summary -->
        <div class="page-section">
          <div class="section-badge">Overview</div>
          <div class="narrative">${u}</div>

          <div class="kpi-row">
            <div class="kpi kpi-accent">
              <div class="kpi-value" style="color:${M}">${e(p.finalMedian)}</div>
              <div class="kpi-label">Median (Expected)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:${F}">${e(p.finalP75)}</div>
              <div class="kpi-label">Optimistic (75th)</div>
            </div>
            <div class="kpi">
              <div class="kpi-value" style="color:#eab308">${e(p.finalP25)}</div>
              <div class="kpi-label">Pessimistic (25th)</div>
            </div>
          </div>

          <div class="kpi-row kpi-row-secondary">
            <div class="kpi-sm">
              <span class="kpi-sm-label">Starting Value</span>
              <span class="kpi-sm-value">${e(o.startingBalance)}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Simulations</span>
              <span class="kpi-sm-value">${N.toLocaleString()}</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Survived</span>
              <span class="kpi-sm-value">${p.survivalRate}%</span>
            </div>
            <div class="kpi-sm">
              <span class="kpi-sm-label">Depleted</span>
              <span class="kpi-sm-value">${100-p.survivalRate}%</span>
            </div>
          </div>
        </div>

        <!-- Page 2: Monte Carlo Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Projected Growth</div>
          <p class="section-explainer">The chart below shows the range of possible portfolio outcomes over time. The shaded bands represent the probability corridors — the wider violet band covers 80% of outcomes (10th to 90th percentile), while the narrower green band covers the middle 50% (25th to 75th). The cyan line marks the median path.</p>
          ${w}
        </div>

        <!-- Page 3: Distribution Chart -->
        <div class="page-section page-break">
          <div class="section-badge">Outcome Distribution</div>
          <p class="section-explainer">This histogram shows how final portfolio values are distributed across all ${N} simulations. Each bar represents a range of outcomes — taller bars mean more simulations landed in that range. The dashed lines mark key percentiles.</p>
          ${h}
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
                <th style="color:${C}">10th</th>
                <th style="color:#eab308">25th</th>
                <th style="color:${M}">Median</th>
                <th style="color:${F}">75th</th>
                <th style="color:${C}">90th</th>
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
  td.median-col { color: ${M}; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) { background: rgba(255,255,255,0.015); }

  /* Tags */
  .tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: inline-block; }
  .tag-deposit { background: rgba(16,185,129,0.12); color: ${F}; }
  .tag-withdrawal { background: rgba(234,179,8,0.12); color: #eab308; }
  .tag-oneoff { background: rgba(139,92,246,0.12); color: ${C}; }

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
    ${i}
  </div>
  <div class="report-footer">
    Vibe Finance &middot; Monte Carlo Portfolio Simulator &middot; ${a.length} scenario${a.length!==1?"s":""} &middot; ${N.toLocaleString()} simulations each
  </div>
</body>
</html>`}function ne(){const{user:a}=q(),{currency:x}=W(),[e,s]=y.useState([]),[i,o]=y.useState(!1),[p,u]=y.useState(!1),[g,$]=y.useState(new Set),[w,h]=y.useState(!1),[l,r]=y.useState(!1),[f,v]=y.useState(!1),k=y.useCallback(async()=>{if(a){o(!0);try{const c=await K(a.uid);s(c),u(!0)}catch(c){console.error("Failed to load scenarios",c)}o(!1)}},[a]),P=y.useCallback(c=>{$(m=>{const n=new Set(m);return n.has(c)?n.delete(c):n.add(c),n})},[]),L=y.useCallback(()=>{g.size===e.length?$(new Set):$(new Set(e.map(c=>c.id)))},[g.size,e]),j=y.useMemo(()=>e.filter(c=>g.has(c.id)),[e,g]),S=y.useCallback(c=>{j.length&&(h(!0),v(!1),setTimeout(()=>{try{const m=j.map(d=>({scenario:d,result:Y({startingBalance:d.startingBalance,cashFlows:d.cashFlows,volatility:V,numPaths:N,endOverride:d.simulationEnd||void 0})})),n=new Date().toISOString().slice(0,10);if(c==="csv")_(new Blob([ae(m,x.code)],{type:"text/csv"}),`vibe-finance-report-${n}.csv`);else if(c==="html")_(new Blob([B(m,x.code)],{type:"text/html"}),`vibe-finance-report-${n}.html`);else if(c==="pdf"){const d=B(m,x.code),b=window.open("","_blank");b&&(b.document.write(d),b.document.close(),setTimeout(()=>b.print(),500))}}catch(m){console.error("Report generation failed",m)}h(!1)},100))},[j,x.code]);return a?t.jsx("div",{className:"page-container",children:t.jsxs("div",{className:"ps-page",children:[t.jsx("h1",{className:"ps-page-title",children:"Reports"}),w&&t.jsx(O,{text:"Generating report…"}),t.jsxs("div",{className:"ps-card rp-card",children:[t.jsxs("div",{className:"rp-card-header",children:[t.jsx("h2",{className:"ps-card-title",children:"Select Scenarios"}),!p&&!i&&t.jsx("button",{className:"ps-btn ps-btn--secondary",onClick:k,children:"Load Scenarios"})]}),i&&t.jsx("div",{style:{textAlign:"center",padding:"32px 0"},children:t.jsx(O,{text:"Loading scenarios…"})}),p&&e.length===0&&t.jsx("p",{style:{color:"var(--text-muted)",padding:"16px 0"},children:"No saved scenarios found. Go to the Portfolio Simulator to create and save scenarios."}),p&&e.length>0&&t.jsxs(t.Fragment,{children:[t.jsxs("table",{className:"rp-table",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{className:"rp-th-check",children:t.jsx("label",{className:"rp-check-label",children:t.jsx("input",{type:"checkbox",checked:g.size===e.length&&e.length>0,onChange:L})})}),t.jsx("th",{children:"Scenario"}),t.jsx("th",{children:"Starting Balance"}),t.jsx("th",{children:"Cash Flows"}),t.jsx("th",{children:"Horizon"})]})}),t.jsx("tbody",{children:e.map(c=>t.jsxs("tr",{className:g.has(c.id)?"rp-row-selected":"",children:[t.jsx("td",{className:"rp-td-check",children:t.jsx("label",{className:"rp-check-label",children:t.jsx("input",{type:"checkbox",checked:g.has(c.id),onChange:()=>P(c.id)})})}),t.jsx("td",{className:"rp-td-name",children:c.name}),t.jsx("td",{className:"rp-td-num",children:G(c.startingBalance,x.code)}),t.jsx("td",{className:"rp-td-num",children:c.cashFlows.length}),t.jsx("td",{children:c.simulationEnd?D(c.simulationEnd):"Auto"})]},c.id))})]}),t.jsxs("div",{className:"rp-actions",children:[t.jsxs("span",{className:"rp-selected-count",children:[g.size," selected"]}),t.jsx("button",{className:"ps-btn ps-btn--primary",disabled:g.size===0||w,onClick:()=>v(!0),children:"Generate Report"})]})]})]}),f&&t.jsx("div",{className:"ps-modal-backdrop",onClick:()=>v(!1),children:t.jsxs("div",{className:"rp-format-picker",onClick:c=>c.stopPropagation(),children:[t.jsx("h3",{className:"rp-format-title",children:"Choose Report Format"}),t.jsxs("div",{className:"rp-format-options",children:[t.jsxs("button",{className:"rp-format-btn",onClick:()=>S("html"),children:[t.jsx("span",{className:"rp-format-icon",children:"🌐"}),t.jsxs("div",{children:[t.jsx("span",{className:"rp-format-label",children:"HTML"}),t.jsx("span",{className:"rp-format-desc",children:"Rich styled report, viewable in any browser"})]})]}),t.jsxs("button",{className:"rp-format-btn",onClick:()=>S("pdf"),children:[t.jsx("span",{className:"rp-format-icon",children:"📄"}),t.jsxs("div",{children:[t.jsx("span",{className:"rp-format-label",children:"PDF"}),t.jsx("span",{className:"rp-format-desc",children:"Print-ready via browser print dialog"})]})]}),t.jsxs("button",{className:"rp-format-btn",onClick:()=>S("csv"),children:[t.jsx("span",{className:"rp-format-icon",children:"📊"}),t.jsxs("div",{children:[t.jsx("span",{className:"rp-format-label",children:"CSV"}),t.jsx("span",{className:"rp-format-desc",children:"Opens in Excel, Google Sheets, etc."})]})]})]}),t.jsx("button",{className:"rp-format-cancel",onClick:()=>v(!1),children:"Cancel"})]})}),l&&t.jsx(A,{onClose:()=>r(!1)})]})}):t.jsx("div",{className:"page-container",children:t.jsxs("div",{className:"ps-page",children:[t.jsx("h1",{className:"ps-page-title",children:"Reports"}),t.jsxs("div",{className:"ps-card",style:{textAlign:"center",padding:"48px 24px"},children:[t.jsx("p",{style:{color:"var(--text-secondary)",marginBottom:16},children:"Sign in to generate reports from your saved scenarios."}),t.jsx("button",{className:"ps-btn ps-btn--primary",onClick:()=>r(!0),children:"Sign In"})]}),l&&t.jsx(A,{onClose:()=>r(!1)})]})})}export{ne as ReportsPage};
