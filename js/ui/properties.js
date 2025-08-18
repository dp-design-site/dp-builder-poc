/*
 DP Configurator — Properties Panel (v0.13, MVP)
 File: js/ui/properties.js
*/

// state
let currentWidget = null;

// DOM
const propsPanel = document.getElementById('properties-panel');

function clearProps() {
  propsPanel.querySelector('.props-body').innerHTML = '';
}

function buildGroup(title, className = '') {
  const group = document.createElement('div');
  group.className = `prop-group ${className}`;
  const head = document.createElement('div');
  head.className = 'prop-head';
  head.textContent = title;
  const body = document.createElement('div');
  body.className = 'prop-body';
  group.appendChild(head);
  group.appendChild(body);
  return { group, body };
}

function addRow(body, label, inputs, rowClass = '') {
  const row = document.createElement('div');
  row.className = `prop-row ${rowClass}`;
  if (label) {
    const lab = document.createElement('label');
    lab.textContent = label;
    row.appendChild(lab);
  }
  inputs.forEach(inp => row.appendChild(inp));
  body.appendChild(row);
  return row;
}

function buildProps(widget) {
  clearProps();
  if (!widget) return;
  currentWidget = widget;

  const bodyWrap = propsPanel.querySelector('.props-body');

  // Identity
  const gId = buildGroup('Идентичност');
  const idInput = document.createElement('input');
  idInput.value = widget.dataset.id || widget.id;
  addRow(gId.body, 'ID', [idInput], 'row-2');
  const nameInput = document.createElement('input');
  nameInput.value = widget.dataset.name || widget.getAttribute('data-name') || 'Window';
  addRow(gId.body, 'Име', [nameInput], 'row-2');
  bodyWrap.appendChild(gId.group);

  // Layout
  const gLayout = buildGroup('Разположение');
  const xInput = document.createElement('input');
  const yInput = document.createElement('input');
  const wInput = document.createElement('input');
  const hInput = document.createElement('input');
  const zInput = document.createElement('input');
  xInput.value = widget.offsetLeft;
  yInput.value = widget.offsetTop;
  wInput.value = widget.offsetWidth;
  hInput.value = widget.offsetHeight;
  zInput.value = widget.style.zIndex || 1;
  addRow(gLayout.body, null, [xInput, yInput, wInput, hInput], 'row-4');
  const downBtn = document.createElement('button');
  downBtn.textContent = '˅';
  const upBtn = document.createElement('button');
  upBtn.textContent = '˄';
  const zRow = addRow(gLayout.body, 'Z', [zInput, downBtn, upBtn], 'row-2 zline');
  bodyWrap.appendChild(gLayout.group);

  // Appearance
  const gApp = buildGroup('Външен вид');
  const bgColor = document.createElement('input');
  bgColor.type = 'color';
  const bgHex = document.createElement('input');
  bgHex.className = 'hex';
  bgHex.value = '#FA0000';
  addRow(gApp.body, 'Background', [bgColor, bgHex], 'row-color');
  const brColor = document.createElement('input');
  brColor.type = 'color';
  const brHex = document.createElement('input');
  brHex.className = 'hex';
  brHex.value = '#37F2F6';
  addRow(gApp.body, 'Border', [brColor, brHex], 'row-color');
  const radInput = document.createElement('input');
  radInput.value = 0;
  addRow(gApp.body, 'Radius', [radInput], 'row-2');

  const shCheck = document.createElement('input');
  shCheck.type = 'checkbox';
  const shLabel = document.createElement('span');
  shLabel.textContent = 'Shadow';
  const shColor = document.createElement('input');
  shColor.type = 'color';
  const shHex = document.createElement('input');
  shHex.className = 'hex';
  shHex.value = '#000000';
  addRow(gApp.body, null, [shCheck, shLabel, shColor, shHex], 'shadow-row');

  bodyWrap.appendChild(gApp.group);

  // event listeners (basic sync)
  idInput.addEventListener('input', e => widget.id = e.target.value);
  nameInput.addEventListener('input', e => widget.dataset.name = e.target.value);

  xInput.addEventListener('input', e => widget.style.left = e.target.value + 'px');
  yInput.addEventListener('input', e => widget.style.top = e.target.value + 'px');
  wInput.addEventListener('input', e => widget.style.width = e.target.value + 'px');
  hInput.addEventListener('input', e => widget.style.height = e.target.value + 'px');
  zInput.addEventListener('input', e => widget.style.zIndex = e.target.value);
  downBtn.addEventListener('click', () => widget.style.zIndex = parseInt(widget.style.zIndex||1)-1);
  upBtn.addEventListener('click', () => widget.style.zIndex = parseInt(widget.style.zIndex||1)+1);

  bgColor.addEventListener('input', e => { widget.querySelector('.wb').style.background = e.target.value; bgHex.value = e.target.value; });
  bgHex.addEventListener('input', e => { widget.querySelector('.wb').style.background = e.target.value; bgColor.value = e.target.value; });
  brColor.addEventListener('input', e => { widget.querySelector('.wb').style.borderColor = e.target.value; brHex.value = e.target.value; });
  brHex.addEventListener('input', e => { widget.querySelector('.wb').style.borderColor = e.target.value; brColor.value = e.target.value; });
  radInput.addEventListener('input', e => { widget.querySelector('.wb').style.borderRadius = e.target.value + 'px'; });
  shCheck.addEventListener('change', e => { widget.querySelector('.wb').style.boxShadow = e.target.checked ? `0 2px 8px ${shHex.value}` : 'none'; });
  shColor.addEventListener('input', e => { if (shCheck.checked) widget.querySelector('.wb').style.boxShadow = `0 2px 8px ${e.target.value}`; shHex.value = e.target.value; });
  shHex.addEventListener('input', e => { if (shCheck.checked) widget.querySelector('.wb').style.boxShadow = `0 2px 8px ${e.target.value}`; shColor.value = e.target.value; });
}

// API
window.Properties = { buildProps };
