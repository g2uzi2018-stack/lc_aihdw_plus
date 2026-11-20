// Body for JLCEDA Pro "invoke --code-file". Dimensions are in mm except where named Mil.
const a = __CLI__.args;
const editor = eda.dmt_EditorControl;
if (!a.projectUuid || !(await eda.dmt_Project.waitForReady(a.projectUuid,30000))) throw Error('Target project tree not ready');
const project = await eda.dmt_Project.getCurrentProjectInfo();
if (project?.uuid !== a.projectUuid) throw Error('Project UUID mismatch');
const board = (await eda.dmt_Board.getAllBoardsInfo()).find(b => b.pcb?.uuid === a.pcbUuid);
if (!board) throw Error('Target PCB is not on a board in this project');

const { widthMm, heightMm, radiusMm, lineWidthMil, locked } = a;
if (![widthMm, heightMm, radiusMm, lineWidthMil].every(Number.isFinite) ||
    Math.min(widthMm, heightMm, lineWidthMil) <= 0 || radiusMm < 0 ||
    2 * radiusMm > Math.min(widthMm, heightMm) || typeof locked !== 'boolean') {
  throw Error('Invalid rectangle dimensions, line width or lock state');
}
const origin = a.originMil;
if (origin && (origin.length !== 2 || !origin.every(Number.isFinite))) throw Error('Invalid originMil');
const anchor = a.leftBottomMm;
if (anchor && (anchor.length !== 2 || !anchor.every(Number.isFinite))) throw Error('Invalid leftBottomMm');
if (a.copperLayers !== undefined && (!Number.isInteger(a.copperLayers) ||
    a.copperLayers < 2 || a.copperLayers > 32 || a.copperLayers % 2)) throw Error('Invalid copper layer count');
const mil = mm => mm / 0.0254;
const closeEnough = (x, y) => typeof x === 'number' && Math.abs(x - y) < 0.00011;
async function openPcb() {
  const tab = await editor.openDocument(a.pcbUuid);
  if (!tab || !(await editor.waitForDocumentReady(tab, 20000)) ||
      (await eda.dmt_SelectControl.getCurrentDocumentInfo())?.uuid !== a.pcbUuid) {
    throw Error('PCB not active in this session');
  }
  return tab;
}
async function read() {
  const lines = (await eda.pcb_PrimitivePolyline.getAll(undefined, 11)).filter(l => !l.getState_Net());
  const eligible = a.outlineId ? lines.filter(l => l.getState_PrimitiveId() === a.outlineId) : lines;
  if (eligible.length !== 1) throw Error('Specify the unique target outlineId on board outline layer 11');
  const line = eligible[0];
  const source = line.getState_Polygon().getSource();
  if (source[0] !== 'R' || source.length !== 7 || source[3] <= 0 || source[4] <= 0) throw Error('Target is not a positive-sized rectangle');
  if (!closeEnough(source[5],0)) throw Error('Rotated outline: this patch handles unrotated rectangles only');
  const origin = await eda.pcb_Document.getCanvasOrigin();
  const layers = (await eda.pcb_Layer.getStackup()).layers.filter(layer => layer.kind === 'copper');
  return { id: line.getState_PrimitiveId(), path: source, locked: line.getState_PrimitiveLock(),
    lineWidthMil: line.getState_LineWidth(), originMil: [origin.offsetX, origin.offsetY], copperLayers: layers.length };
}
function differences(state) {
  const changes = [];
  if (!path.every((v, i) => v === state.path[i] || closeEnough(v, state.path[i])) ||
      !closeEnough(state.lineWidthMil, lineWidthMil) || state.locked !== locked) changes.push('outline');
  if (origin && !origin.every((v, i) => closeEnough(v, state.originMil[i]))) changes.push('origin');
  if (a.copperLayers !== undefined && state.copperLayers !== a.copperLayers) changes.push('layers');
  return changes;
}
const tab = await openPcb();
const before = await read();
const left = anchor ? mil(anchor[0]) : before.path[1];
const bottom = anchor ? mil(anchor[1]) : before.path[2] - before.path[4];
const path = ['R', left, bottom + mil(heightMm), mil(widthMm), mil(heightMm), 0, mil(radiusMm)];
const changes = differences(before);
if (changes.length && a.apply !== true) return { status: 'needs-repair', before, changes };
if (changes.includes('layers') && !(await eda.pcb_Layer.setTheNumberOfCopperLayers(a.copperLayers))) {
  throw Error('Client rejected copper layer count');
}
if (changes.includes('outline')) {
  const polygon = eda.pcb_MathPolygon.createPolygon(path);
  await eda.pcb_PrimitivePolyline.modify(before.id, { polygon, lineWidth: lineWidthMil, primitiveLock: locked });
}
if (changes.includes('origin') && !(await eda.pcb_Document.setCanvasOrigin(...origin))) {
  throw Error('Client rejected canvas origin');
}
if (changes.length && !(await eda.pcb_Document.save())) throw Error('PCB save failed');
if (!(await editor.closeDocument(tab))) throw Error('Could not close target PCB for readback');
await openPcb();
const after = await read();
if (before.id !== after.id || differences(after).length) throw Error('Reopened PCB outline does not match the requested geometry');
return { status: changes.length ? 'repaired' : 'already-correct', saved: changes.length > 0, reopened: true,
  projectUuid: project.uuid, pcbUuid: a.pcbUuid, before, after, changes };
