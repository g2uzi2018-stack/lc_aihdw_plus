// JLCEDA Pro invoke body. openPins contains only pins explicitly open on the source schematic.
const a = __CLI__.args;
const editor = eda.dmt_EditorControl;
if (!a.projectUuid || !(await eda.dmt_Project.waitForReady(a.projectUuid,30000))) throw Error('Target project tree not ready');
const badNet = a.stubNet ?? 'NC';
const targets = new Set(a.openPins);
if ((await eda.dmt_Project.getCurrentProjectInfo())?.uuid !== a.projectUuid) throw Error('Project UUID mismatch');
if (!Array.isArray(a.openPins) || !targets.size || targets.size !== a.openPins.length || !badNet) throw Error('Expected distinct openPins and a nonempty stubNet');
const board = (await eda.dmt_Board.getAllBoardsInfo()).find(b => b.pcb?.uuid === a.pcbUuid);
const page = (await eda.dmt_Schematic.getAllSchematicPagesInfo()).find(p =>
  p.uuid === a.pageUuid && p.parentSchematicUuid === board?.schematic?.uuid);
if (!page) throw Error('Schematic page and PCB are not on the same board');
const source = { projectId: a.projectUuid, schematicName: board.schematic.name, pageName: page.name };
async function open(uuid) {
  const tab = await editor.openDocument(uuid);
  if (!tab || !(await editor.waitForDocumentReady(tab, 20000)) ||
      (await eda.dmt_SelectControl.getCurrentDocumentInfo())?.uuid !== uuid) throw Error('Document not active: ' + uuid);
  return tab;
}
async function close(tab) {
  if (!(await editor.closeDocument(tab))) throw Error('Could not close tab for readback: ' + tab);
}
const sorted = rows => rows.sort((x, y) => x[0].localeCompare(y[0]));
const equal = (x, y) => JSON.stringify(x) === JSON.stringify(y);
// The canvas's getState_Net() can be empty even when the saved WIRE owns an explicit NET attribute.
async function pageSource() {
  const text = await eda.sys_FileManager.getDocumentSource();
  if (!text) throw Error('Empty source for the active schematic page');
  let selected = false, seen = false;
  const latest = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const pos = raw.indexOf('||');
    if (pos < 0) continue;
    const header = JSON.parse(raw.slice(0,pos));
    const body = raw.slice(pos+2).replace(/\|$/, '');
    const value = body ? JSON.parse(body) : null;
    if (header.type === 'DOCHEAD') {
      selected = value.docType === 'SCH_PAGE' && value.uuid === a.pageUuid;
      if (selected) seen = true;
    } else if (selected) {
      const key = JSON.stringify([header.type,header.id]);
      const previous = latest.get(key);
      if (!previous || header.ticket >= previous[0].ticket) latest.set(key,[header,value]);
    }
  }
  if (!seen) throw Error('Active source does not contain the requested SCH_PAGE');
  const rows = [...latest.values()].filter(([,v]) => v !== null);
  const wires = new Map(rows.filter(([h]) => h.type === 'WIRE').map(([h]) => [h.id,{id:h.id, labels:[], line:[]}]));
  for (const [h,v] of rows) {
    if (h.type === 'ATTR' && v.key === 'NET' && v.value && wires.has(v.parentId)) wires.get(v.parentId).labels.push(v.value);
    if (h.type === 'LINE' && wires.has(v.lineGroup)) wires.get(v.lineGroup).line.push([v.startX,v.startY,v.endX,v.endY]);
  }
  const markers = new Set(rows.filter(([h,v]) => h.type === 'ATTR' && v.key === 'NO_CONNECT' && v.value === 'yes').map(([,v]) => v.parentId));
  const records = [...wires.values()].map(w => ({ ...w, net: [...new Set(w.labels)].sort().join('\n'), line: w.line.sort((l,r) => JSON.stringify(l).localeCompare(JSON.stringify(r))) }));
  return { wires: records, markers };
}
async function schematic() {
  const file = await eda.sch_ManufactureData.getNetlistFile('sch', 'JLCEDA');
  const netlist = JSON.parse(await file.text());
  const nets = new Map();
  for (const c of Object.values(netlist.components)) {
    for (const [pin, info] of Object.entries(c.pinInfoMap ?? {})) {
      if (c.props?.Designator) nets.set(c.props.Designator + '.' + pin, info.net || '');
    }
  }
  const {wires, markers} = await pageSource();
  const pins = [];
  for (const comp of await eda.sch_PrimitiveComponent.getAll(undefined, false)) {
    const ref = comp.getState_Designator();
    const cid = comp.getState_PrimitiveId();
    for (const pin of await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(cid) ?? []) {
      pins.push({ key: ref + '.' + pin.pinNumber, id: pin.primitiveId, xy: [pin.x, pin.y], marked: markers.has(pin.primitiveId) });
    }
  }
  const selected = [];
  for (const key of targets) {
    const found = pins.filter(pin => pin.key === key);
    if (found.length !== 1 || !nets.has(key)) throw Error('Unresolved target pin: ' + key);
    selected.push({ ...found[0], net: nets.get(key) });
  }
  return { nets, wires, pins, selected };
}
async function pcb() {
  const pads = [];
  for (const c of await eda.pcb_PrimitiveComponent.getAll()) {
    for (const p of c.getState_Pads()) pads.push([c.getState_Designator() + '.' + p.padNumber, p.primitiveId, p.net || '']);
  }
  pads.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const copper = [];
  for (const [type, api, fields] of [
    ['line', eda.pcb_PrimitiveLine, ['Layer','StartX','StartY','EndX','EndY','LineWidth']],
    ['arc', eda.pcb_PrimitiveArc, ['Layer','StartX','StartY','EndX','EndY','ArcAngle','LineWidth']],
    ['via', eda.pcb_PrimitiveVia, ['X','Y','Diameter','HoleDiameter']]
  ]) {
    for (const item of await api.getAll()) copper.push([item.getState_PrimitiveId(), type, item.getState_Net(), ...fields.map(f => item['getState_' + f]())]);
  }
  return { pads, copper: sorted(copper) };
}
const near = (a, b) => Math.abs(a - b) < 0.0001;
const samePoint = (a, b) => near(a[0], b[0]) && near(a[1], b[1]);
function side([a, b], p) {
  const cross = (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]);
  return near(cross, 0) ? 0 : Math.sign(cross);
}
function on(segment, p) {
  const [a,b] = segment;
  return side(segment,p) === 0 && p.every((v,i) => v >= Math.min(a[i],b[i])-0.0001 && v <= Math.max(a[i],b[i])+0.0001);
}
function intersects(s, t) {
  return t.some(p => on(s,p)) || s.some(p => on(t,p)) || (side(s,t[0])*side(s,t[1]) < 0 && side(t,s[0])*side(t,s[1]) < 0);
}
function removalPlan(sch) {
  const stubs = [];
  const named = sch.wires.filter(w => w.net === badNet);
  if (!named.length && sch.selected.every(p => p.net === '')) return stubs;
  if (sch.pins.some(p => !p.id || !p.xy.every(Number.isFinite))) throw Error('Incomplete schematic pin geometry; no stub can be removed safely');
  const paths = sch.wires.map(w => ({ ...w, segments: w.line.map(l => [l.slice(0,2), l.slice(2,4)]) }));
  // Check the API's canvas Y convention against named, connected pins on this actual page.
  // Never pick the sign by trying alternative positions on the suspect NC wires.
  const landmarks = paths.filter(w => w.net && w.net !== badNet);
  const scores = [1,-1].map(sign => sch.pins.filter(p => {
    const net = sch.nets.get(p.key);
    return net && net !== badNet && landmarks.some(w => w.net === net &&
      w.segments.some(s => s.some(q => samePoint(q,[p.xy[0],sign*p.xy[1]]))));
  }).length);
  if (scores[0] === scores[1]) throw Error('Cannot establish pin coordinates from connected schematic landmarks');
  const sign = scores[0] > scores[1] ? 1 : -1;
  const position = p => [p.xy[0], sign*p.xy[1]];
  for (const p of sch.selected) {
    if (p.net && p.net !== badNet) throw Error('Target has a functional net: ' + p.key + ' = ' + p.net);
    const matches = paths.filter(w => w.net === badNet && w.segments.some(s => on(s,position(p))));
    if (!matches.length && !p.net) continue;
    if (matches.length !== 1) throw Error('Ambiguous or missing named stub: ' + p.key);
    const stub = matches[0], seg = stub.segments[0];
    if (stub.segments.length !== 1 || !seg.some(q => samePoint(q,position(p))) || samePoint(seg[0],seg[1]) ||
        (!near(seg[0][0],seg[1][0]) && !near(seg[0][1],seg[1][1])) ||
        sch.pins.some(other => other.id !== p.id && on(seg,position(other))) ||
        paths.some(w => w.id !== stub.id && w.segments.some(other => intersects(seg,other)))) {
      throw Error('Wire is not an isolated straight stub at ' + p.key + ': ' + stub.id);
    }
    stubs.push({ pin: p.key, wire: stub.id });
  }
  return stubs;
}
const keepWires = (wires, excluded) => sorted(wires.filter(w => !excluded.has(w.id)).map(w => [w.id, w.net, w.line]));
const schTab = await open(a.pageUuid);
const before = await schematic();
const stubs = removalPlan(before);
const marks = before.selected.filter(p => !p.marked);
const oldBoardTab = await open(a.pcbUuid);
const boardBefore = await pcb();
const padsFor = (rows, key) => rows.filter(p => p[0] === key).map(p => p[2]);
for (const p of before.selected) {
  const nets = padsFor(boardBefore.pads, p.key);
  if (!nets.length || nets.some(n => n && n !== badNet)) throw Error('Missing pad or functional PCB net at ' + p.key);
}
const expectedPads = boardBefore.pads.map(([k,id,n]) => [k,id,targets.has(k) ? '' : n]);
const needsImport = !equal(expectedPads, boardBefore.pads);
const changed = Boolean(stubs.length || marks.length || needsImport);
if (changed && a.apply !== true) return { status: 'needs-repair', stubs, missingMarkers: marks.map(p => p.key), needsImport };
if (needsImport) {
  // The native import is global. Verify every other board pad against the schematic before authorizing it.
  const pcbPins = new Set(boardBefore.pads.map(p => p[0]));
  for (const key of before.nets.keys()) {
    if (!pcbPins.has(key)) throw Error('Schematic pin is missing from PCB before import: ' + key);
  }
  for (const [key,,net] of boardBefore.pads) {
    if (!targets.has(key) && before.nets.get(key) !== net) throw Error('Unrelated PCB/schematic mismatch: ' + key);
  }
  if (boardBefore.copper.some(item => item[2] === badNet)) throw Error('Routed copper exists on the suspect net');
}
await close(oldBoardTab);
await open(a.pageUuid);
for (const p of marks) await eda.sch_PrimitivePin.modify(p.id, { noConnected: true });
if (marks.length && !(await eda.sch_Document.save())) throw Error('Could not save NC markers');
await close(schTab);
for (const stub of stubs) {
  const result = await eda.sch_SourcePrimitiveWire.remove({ ...source, primitiveId: stub.wire });
  if (!result.ok) throw Error('Could not remove stub ' + stub.wire + ': ' + JSON.stringify(result.error));
}
await open(a.pageUuid);
const after = await schematic();
const removed = new Set(stubs.map(p => p.wire));
if (!equal(keepWires(before.wires, removed), keepWires(after.wires, new Set()))) throw Error('Unrelated schematic wire changed');
const expectedNets = sorted([...before.nets].map(([key,net]) => [key,targets.has(key) ? '' : net]));
if (!equal(expectedNets, sorted([...after.nets])) || after.selected.some(p => !p.marked || p.net !== '') || removalPlan(after).length) {
  throw Error('Reopened schematic pin/marker verification failed');
}
const pcbTab = await open(a.pcbUuid);
if (needsImport) {
  if (!(await eda.pcb_Document.importChanges(board.schematic.uuid, true))) throw Error('PCB import failed');
  if (!(await eda.pcb_Document.save())) throw Error('PCB save failed');
}
await close(pcbTab);
await open(a.pcbUuid);
const boardAfter = await pcb();
if (!equal(expectedPads, boardAfter.pads) || !equal(boardBefore.copper, boardAfter.copper)) throw Error('Reopened PCB pad or routed copper mismatch');
return { status: changed ? 'repaired' : 'already-correct', projectUuid: a.projectUuid, pcbUuid: a.pcbUuid, pageUuid: a.pageUuid,
  reopened: true, removedStubs: stubs, addedMarkers: marks.map(p => p.key), imported: needsImport, untouchedSchematicWires: after.wires.length,
  preservedPcbTracksArcsVias: boardAfter.copper.length, logicalPins: after.nets.size,
  openPins: after.selected.map(p => ({ pin: p.key, marker: p.marked, schematicNet: p.net, pcbNets: padsFor(boardAfter.pads,p.key) })) };
