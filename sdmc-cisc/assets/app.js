const colors={HASH256:"#005030",XOF:"#ffb81c",CXOF:"#ff6a00",XOF_CHAIN:"#13294b",CXOF_CHAIN:"#7a1fa2",AEAD_ENC:"#008a66",AEAD_DEC:"#b45309"};
let summary={}, rows=[], computed=[];

const num=(x,d=0)=>{const n=Number(x);return Number.isFinite(n)?n:d};
const fmt=(x,d=3)=>{const n=Number(x);if(!Number.isFinite(n))return"—";if(Math.abs(n)>=1000)return n.toFixed(1);if(Math.abs(n)>=1)return n.toFixed(d);return n.toExponential(2)};
function parseCSV(t){const L=t.trim().split(/\r?\n/).filter(Boolean);const H=L.shift().split(",");return L.map(l=>{const V=l.split(",");let o={};H.forEach((h,i)=>o[h]=V[i]??"");return o})}
function pbytes(r){let m=num(r.msg_bytes),c=num(r.cs_bytes),a=num(r.ad_bytes);if(r.mode.includes("AEAD"))return Math.max(1,m+a);if(r.mode.includes("CXOF"))return Math.max(1,m+c);return Math.max(1,m)}
function obytes(r){return Math.max(1,num(r.out_bytes,num(r.msg_bytes,1)))}
function recompute(){
  const P=num(document.getElementById("powerInput").value,summary.post_pnr_power_mw);
  const F=num(document.getElementById("freqInput").value,summary.frequency_mhz);
  computed=rows.map(r=>{
    const C=num(r.cycles), pb=pbytes(r), ob=obytes(r), N=Math.max(1,num(r.chain_count,1));
    const power=num(r.power_mw,P), t=C/F, e=power*t;
    const areaUm2 = Math.max(1, num(summary.total_cell_area_um2 || summary.cell_area_um2 || summary.area_um2, 1));
    const areaMm2 = areaUm2 / 1e6;
    return {...r,
      processed_bytes:pb,
      final_output_bytes:ob,
      effective_power_mw:power,
      fixed_area_um2:areaUm2,
      fixed_area_mm2:areaMm2,
      time_us:t,
      latency_us:t,
      energy_nJ:e,
      energy_uJ:e/1000,
      throughput_MBps:pb/t,
      final_output_throughput_MBps:ob/t,
      energy_nJ_per_byte:e/pb,
      energy_nJ_per_final_byte:e/ob,
      cycles_per_byte:C/pb,
      cycles_per_pass:C/N,
      energy_nJ_per_pass:e/N,
      energy_nJ_per_um2:e/areaUm2,
      energy_uJ_per_mm2:(e/1000)/areaMm2,
      throughput_MBps_per_mm2:(pb/t)/areaMm2,
      final_output_throughput_MBps_per_mm2:(ob/t)/areaMm2
    };
  });
  render();
}
function render(){
  const P=num(document.getElementById("powerInput").value),F=num(document.getElementById("freqInput").value);
  powerCard.textContent=fmt(P,3)+" mW"; freqCard.textContent=fmt(F,3)+" MHz"; epcCard.textContent=fmt(P/F,4)+" nJ";
  processText.textContent=summary.process; designText.textContent=summary.design_name; stageText.textContent=summary.power_stage;
  renderBars();
  chart("cyclesChart",computed,"processed_bytes","cycles","bytes","cycles");
  chart("latencyChart",computed,"processed_bytes","latency_us","bytes","us");
  chart("throughputChart",computed,"processed_bytes","throughput_MBps","bytes","MB/s");
  chart("energyChart",computed,"processed_bytes","energy_uJ","bytes","uJ");
  chart("energyByteChart",computed,"processed_bytes","energy_nJ_per_byte","bytes","nJ/B");
  chart("powerChart",computed,"processed_bytes","effective_power_mw","bytes","mW");
  const ch=computed.filter(r=>r.mode==="XOF_CHAIN"||r.mode==="CXOF_CHAIN");
  chart("chainCyclesChart",ch,"chain_count","cycles","chain_count","cycles");
  chart("chainLatencyChart",ch,"chain_count","latency_us","chain_count","us");
  chart("chainEnergyChart",ch,"chain_count","energy_uJ","chain_count","uJ");
  chart("chainPowerChart",ch,"chain_count","effective_power_mw","chain_count","mW");
  chart("chainEnergyByteChart",ch,"chain_count","energy_nJ_per_final_byte","chain_count","nJ/final B");
  chart("chainFinalThroughputChart",ch,"chain_count","final_output_throughput_MBps","chain_count","final MB/s");
  chart("chainEnergyAreaChart",ch,"chain_count","energy_uJ_per_mm2","chain_count","uJ/mm²");
  chart("chainThroughputAreaChart",ch,"chain_count","final_output_throughput_MBps_per_mm2","chain_count","final MB/s/mm²");
  chart("chainAreaChart",ch,"chain_count","fixed_area_mm2","chain_count","mm²");
  chart("chainCyclesPassChart",ch,"chain_count","cycles_per_pass","chain_count","cycles/pass");
  table();
}
function renderBars(){
  const b=summary.power_breakdown||{}, total=num(summary.post_pnr_power_mw,1);
  powerBars.innerHTML=[
    ["Sequential",b.sequential_mw],["Clock",b.clock_mw],["Combinational",b.combinational_mw],["Leakage",b.leakage_mw]
  ].map(([k,v])=>`<div class="barRow"><b>${k}</b><div class="barTrack"><div class="barFill" style="width:${100*num(v)/total}%"></div></div><span>${fmt(v,3)} mW</span></div>`).join("");
}
function group(data){return data.reduce((a,r)=>((a[r.mode]??=[]).push(r),a),{})}
function chart(id,data,xk,yk,xlab,ylab){
  const el=document.getElementById(id);
  const box=el.closest(".chartBox");
  const oldLegend=box.querySelector(".legend");
  if(oldLegend) oldLegend.remove();

  el.innerHTML="";
  if(!data.length){
    el.innerHTML="<text>No data</text>";
    return;
  }

  const W=720,H=330,M={l:68,r:24,t:24,b:56},PW=W-M.l-M.r,PH=H-M.t-M.b;
  const xs=data.map(r=>num(r[xk])).filter(Number.isFinite);
  const ys=data.map(r=>num(r[yk])).filter(Number.isFinite);
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const ymin=0, ymax=Math.max(...ys)*1.10||1;
  const sx=x=>M.l+((x-xmin)/Math.max(1e-9,xmax-xmin))*PW;
  const sy=y=>M.t+PH-((y-ymin)/Math.max(1e-9,ymax-ymin))*PH;

  el.setAttribute("viewBox",`0 0 ${W} ${H}`);

  for(let i=0;i<=5;i++){
    let y=M.t+PH*i/5;
    let val=ymax*(1-i/5);
    el.insertAdjacentHTML("beforeend",
      `<line class="grid" x1="${M.l}" x2="${W-M.r}" y1="${y}" y2="${y}"/>
       <text class="tick" x="${M.l-10}" y="${y+4}" text-anchor="end">${fmt(val,2)}</text>`);
  }

  for(let i=0;i<=4;i++){
    let x=M.l+PW*i/4;
    let val=xmin+(xmax-xmin)*i/4;
    el.insertAdjacentHTML("beforeend",
      `<line class="grid" x1="${x}" x2="${x}" y1="${M.t}" y2="${M.t+PH}"/>
       <text class="tick" x="${x}" y="${H-28}" text-anchor="middle">${fmt(val,1)}</text>`);
  }

  el.insertAdjacentHTML("beforeend",
    `<line class="axis" x1="${M.l}" x2="${W-M.r}" y1="${M.t+PH}" y2="${M.t+PH}"/>
     <line class="axis" x1="${M.l}" x2="${M.l}" y1="${M.t}" y2="${M.t+PH}"/>
     <text class="tick axisLabel" x="${W/2}" y="${H-6}" text-anchor="middle">${xlab}</text>
     <text class="tick axisLabel" transform="rotate(-90 16 ${H/2})" x="16" y="${H/2}" text-anchor="middle">${ylab}</text>`);

  const grouped=group(data);

  Object.entries(grouped).forEach(([mode,series])=>{
    series.sort((a,b)=>num(a[xk])-num(b[xk]));
    const pts=series.map(r=>[sx(num(r[xk])),sy(num(r[yk]))]);
    const d=pts.map((p,i)=>(i?"L":"M")+p[0]+" "+p[1]).join(" ");

    el.insertAdjacentHTML("beforeend",
      `<path class="line" stroke="${colors[mode]||"#333"}" d="${d}"/>`);

    pts.forEach((p,i)=>{
      const row=series[i];
      el.insertAdjacentHTML("beforeend",
        `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${colors[mode]||"#333"}">
          <title>${mode}
${xlab}: ${row[xk]}
${ylab}: ${fmt(row[yk],4)}
cycles: ${row.cycles}
latency_us: ${fmt(row.time_us,4)}
energy_uJ: ${fmt(row.energy_uJ,4)}</title>
        </circle>`);
    });

    const last=series[series.length-1];
    const lp=pts[pts.length-1];
    if(lp){
      el.insertAdjacentHTML("beforeend",
        `<text class="seriesLabel" x="${Math.min(W-115,lp[0]+8)}" y="${lp[1]-6}" fill="${colors[mode]||"#333"}">${mode}</text>`);
    }
  });

  const legend=document.createElement("div");
  legend.className="legend";
  legend.innerHTML=Object.keys(grouped).map(mode =>
    `<span><i class="sw" style="background:${colors[mode]||"#333"}"></i>${mode}</span>`
  ).join("");
  box.appendChild(legend);
}
function table(){
  const cols=["mode","msg_bytes","cs_bytes","ad_bytes","out_bytes","chain_count","cycles","time_us","effective_power_mw","fixed_area_mm2","throughput_MBps","final_output_throughput_MBps","energy_uJ","energy_nJ_per_byte","energy_nJ_per_final_byte","energy_uJ_per_mm2","final_output_throughput_MBps_per_mm2","cycles_per_pass","energy_nJ_per_pass","notes"];
  dataTable.innerHTML="<tr>"+cols.map(c=>`<th>${c}</th>`).join("")+"</tr>"+computed.map(r=>"<tr>"+cols.map(c=>`<td>${typeof r[c]==="number"?fmt(r[c],4):(r[c]??"")}</td>`).join("")+"</tr>").join("");
}
Promise.all([fetch("data/chip_summary.json").then(r=>r.json()),fetch("data/perf_points.csv").then(r=>r.text())]).then(([s,csv])=>{
  summary=s; rows=parseCSV(csv);
  powerInput.value=s.post_pnr_power_mw; freqInput.value=s.frequency_mhz;
  recompute();
});
