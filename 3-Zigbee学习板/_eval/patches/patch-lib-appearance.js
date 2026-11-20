// Windows Node 24: node patch-lib-appearance.js <closed project folder> <appearance.json> [--apply]
// Without --apply the command reads the actual files and describes the proposed changes.
// Files, document UUIDs, original geometry and replacements are supplied by the caller.
// Preserve untouched native records verbatim, including unknown properties.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual: same } = require('node:util');
const [project, configPath, mode] = process.argv.slice(2);
if (!project || !configPath || (mode && mode !== '--apply')) {
  throw Error('Usage: node patch-lib-appearance.js <project> <appearance.json> [--apply]');
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const fieldsMatch = (body, fields) =>
  Object.entries(fields || {}).every(([key, value]) => same(body[key], value));
const encode = (head, body) => JSON.stringify(head) + '||' + JSON.stringify(body) + '|';

function planFile(relativePath, sections) {
  const file = path.resolve(project, relativePath);
  const original = fs.readFileSync(file, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.split(/\r?\n/);
  const scopes = new Map();
  let scope;
  for (const [i, line] of lines.entries()) {
    const sep = line.indexOf('||');
    if (sep < 0) continue;
    const head = JSON.parse(line.slice(0, sep));
    const body = JSON.parse(line.slice(sep + 2).replace(/\|+$/, '') || '{}');
    if (head.type === 'DOCHEAD') {
      const key = body.docType + '/' + body.uuid;
      scope = sections.includes(key) ? {end:i, records:new Map()} : null;
      if (scope) scopes.set(key, scope);
    }
    if (scope) {
      scope.end = i;
      if (head.id) scope.records.set(head.type + '/' + head.id, {head,body,i});
    }
  }
  let edits = 0;
  for (const key of sections) {
    const scope = scopes.get(key);
    if (!scope) throw Error(relativePath + ': missing document ' + key);
    const additional = [];
    for (const op of config.sections[key]) {
      const head = op.insert?.h || op.remove?.h || op;
      const id = head.type + '/' + head.id;
      const row = scope.records.get(id);
      const fail = () => {throw Error(relativePath + ' ' + key + ' ' + id + ': source differs from configuration');};
      if (op.insert) {
        if (row && !fieldsMatch(row.body, op.insert.b)) fail();
        if (!row) {additional.push(encode(head, op.insert.b)); edits++;}
      } else if (op.remove) {
        if (!row) continue;
        if (!fieldsMatch(row.body, op.remove.b)) fail();
        lines[row.i] = null;
        edits++;
      } else {
        if (!row || !fieldsMatch(row.body, op.match)) fail();
        if (fieldsMatch(row.body, op.to)) continue;
        if (!fieldsMatch(row.body, op.from)) fail();
        lines[row.i] = encode(row.head, {...row.body, ...op.to});
        edits++;
      }
    }
    if (additional.length) {
      // Append inside the existing document; line indexes in other sections stay valid.
      lines[scope.end] = [lines[scope.end], ...additional].filter(v => v !== null).join(newline);
    }
  }
  return {file,relativePath,original,output:lines.filter(line => line !== null).join(newline),edits};
}

const plans = Object.entries(config.files).map(([file, sections]) => planFile(file, sections));
if (mode === '--apply') {
  const written = [];
  const temps = [];
  try {
    for (const plan of plans.filter(p => p.edits)) {
      if (fs.readFileSync(plan.file, 'utf8') !== plan.original) throw Error('Concurrent edit to ' + plan.relativePath);
      const tmp = plan.file + '.appearance-' + process.pid + '.tmp';
      fs.writeFileSync(tmp, plan.output, {flag:'wx'});
      temps.push(tmp);
      fs.renameSync(tmp, plan.file);
      written.push(plan);
    }
  } catch (error) {
    for (const p of written.reverse()) {
      if (fs.readFileSync(p.file, 'utf8') === p.output) fs.writeFileSync(p.file, p.original);
    }
    throw error;
  } finally {
    for (const tmp of temps) fs.rmSync(tmp, {force:true});
  }
}
console.log(JSON.stringify({applied:mode === '--apply', files:plans.map(p => ({
  path:p.relativePath, changedRecords:p.edits
}))}, null, 2));
