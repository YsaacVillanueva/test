/* ==========================================================
   NOTION FTUX — main.js  (FIXED)
   ========================================================== */

/* ── ESTADO GLOBAL ── */
let USER_SEGMENT = 'personal';
let activeController = null;
let _slashListening = false; // FIX: flag global para evitar listeners / duplicados

const sidebar   = document.getElementById('sidebar');
const mainPanel = document.getElementById('mainPanel');
const docCanvas = document.getElementById('docCanvas');

// FIX: sidebar empieza bloqueado pero progress widget NO se muestra hasta que comience el tutorial
sidebar.classList.add('locked');

/* ── HELPERS ── */
function setProgress(step) {
  document.getElementById('progressLabel').textContent = `Paso ${step} de 4`;
  [1,2,3,4].forEach(i =>
    document.getElementById('seg'+i).classList.toggle('filled', i <= step)
  );
}

// FIX: mascot ahora usa position:fixed (en CSS), y siempre se agrega al body
// para evitar que quede atrapada dentro de un contenedor con overflow:hidden
function showMascot(html, id) {
  id = id || 'mascot';
  const old = document.getElementById(id);
  if (old) old.remove();
  const w = document.createElement('div');
  w.className = 'mascot-wrap';
  w.id = id;
  w.innerHTML = `<div class="mascot-bubble">${html}</div><div class="mascot-face">🙂</div>`;
  document.body.appendChild(w); // FIX: al body, no al mainPanel
}

function hideMascot(id) {
  const el = document.getElementById(id || 'mascot');
  if (el) el.remove();
}

function killActive() {
  if (activeController) { activeController.abort(); activeController = null; }
  _slashListening = false; // FIX: resetear el flag al matar el paso activo
}

// FIX: el menú flotante se posiciona relativo al doc-canvas usando getBoundingClientRect
function openSlashMenu(items, groupLabel, onPick) {
  document.querySelectorAll('.floating-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'floating-menu';
  menu.innerHTML = `<div class="menu-label">${groupLabel}</div>` +
    items.map((it, i) => `<div class="menu-item" data-i="${i}">${it}</div>`).join('');

  // Posicionar el menú debajo del último bloque visible en doc-canvas
  const canvas = document.getElementById('docCanvas');
  // Append primero para medir, luego posicionar
  canvas.appendChild(menu);
  menu.style.cssText = 'position:absolute;left:90px;top:auto;z-index:300;';

  // Colocar debajo del último hijo del canvas (o en un lugar lógico)
  const blocks = document.getElementById('blocksContainer');
  const lastChild = blocks.lastElementChild;
  if (lastChild) {
    const canvasRect = canvas.getBoundingClientRect();
    const blockRect  = lastChild.getBoundingClientRect();
    const relTop = blockRect.bottom - canvasRect.top + canvas.scrollTop + 6;
    menu.style.top = relTop + 'px';
  } else {
    menu.style.top = '160px';
  }

  menu.querySelectorAll('.menu-item').forEach(el => {
    el.addEventListener('click', () => {
      menu.remove();
      onPick(items[+el.dataset.i]);
    });
  });

  // Cerrar menú si se hace clic fuera
  setTimeout(() => {
    document.addEventListener('click', function closeOnOutside(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeOnOutside);
      }
    });
  }, 50);
}

function closeMenu() {
  document.querySelectorAll('.floating-menu').forEach(m => m.remove());
}

/* ── TOAST genérico (cualquier botón puede dar feedback con esto) ── */
function notify(message, opts) {
  opts = opts || {};
  const toast   = document.getElementById('toast');
  const viewBtn = document.getElementById('toastViewBtn');
  document.getElementById('toastText').textContent = message;

  if (opts.actionLabel && opts.onAction) {
    viewBtn.textContent = opts.actionLabel;
    viewBtn.style.display = 'inline-block';
    viewBtn.onclick = () => { toast.classList.remove('active'); opts.onAction(); };
  } else {
    viewBtn.style.display = 'none';
    viewBtn.onclick = null;
  }

  toast.classList.add('active');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('active'), opts.duration || 3500);
}

/* ── BOTÓN SKIP ── */
document.getElementById('skipBtn').addEventListener('click', () => finishOnboarding());

/* ==========================================================
   FASE 0 — REGISTRO
   ========================================================== */
function f0Show(id) {
  document.querySelectorAll('.f0-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('f0Continue1').onclick = () => f0Show('f0_2');
document.getElementById('f0Continue2').onclick = () => f0Show('f0_3');
document.getElementById('f0Continue3').onclick = () => f0Show('f0_4');

let f0Selected = null;
document.querySelectorAll('.f0-usecase-card').forEach(card => {
  card.onclick = () => {
    document.querySelectorAll('.f0-usecase-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    f0Selected = card.dataset.seg;
    document.getElementById('f0Continue4').disabled = false;
  };
});

document.getElementById('f0Continue4').onclick = () => {
  if (!f0Selected) return;
  USER_SEGMENT = f0Selected;
  const fase0 = document.getElementById('fase0');
  fase0.style.opacity = '0';
  fase0.style.transition = 'opacity .3s';
  setTimeout(() => {
    fase0.remove();
    startTutorial();
  }, 300);
};

/* ==========================================================
   INICIO DEL TUTORIAL
   ========================================================== */
function startTutorial() {
  // FIX: mostrar el progress widget Y agregar clase para empujar el contenido
  const pw = document.getElementById('progressWidget');
  pw.classList.add('active');
  document.getElementById('workspaceView').classList.add('has-progress');
  mainPanel.classList.add('tutorial-active');
  setProgress(1);
  step1_LimpiarLienzo();
}

/* ==========================================================
   PASO 1 — Borrar el H1
   FIX: en vez de escuchar keyup en document (que nunca triggerea si el foco
   está mal), usamos un MutationObserver + input event en el propio h1Block
   ========================================================== */
function step1_LimpiarLienzo() {
  killActive();
  setProgress(1);

  const h1 = document.getElementById('h1Block');
  h1.contentEditable = 'true';

  // FIX: pequeño delay para que el DOM esté listo antes de hacer focus
  setTimeout(() => h1.focus(), 100);

  showMascot(
    '👋 ¡Hola! Empecemos limpiando el lienzo.<br>Selecciona el texto con <b>Ctrl+A</b> y bórralo con <b>Backspace</b>.<br><small>O simplemente haz clic y bórralo letra a letra.</small>',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  // FIX: escuchar el evento 'input' directamente en el h1 — mucho más confiable
  function checkEmpty() {
    if (h1.textContent.trim().length === 0) {
      killActive();
      h1.classList.add('hidden');
      h1.contentEditable = 'false';
      hideMascot('mascot');
      step2_EscribirTitulo();
    }
  }

  h1.addEventListener('input', checkEmpty, { signal: sig });
  // FIX: también escuchar keydown como backup para Delete/Backspace
  h1.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      setTimeout(checkEmpty, 0);
    }
  }, { signal: sig });
}

/* ==========================================================
   PASO 2 — Escribir título
   ========================================================== */
function step2_EscribirTitulo() {
  killActive();

  const tb = document.getElementById('titleBlock');
  tb.classList.remove('hidden');
  tb.contentEditable = 'true';
  setTimeout(() => tb.focus(), 100);

  showMascot(
    '💡 ¡Lienzo limpio! En Notion todo es un <b>Bloque</b>.<br>Escribe el título de tu página y presiona <b>Enter</b> para continuar.',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  tb.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tb.textContent.trim().length === 0) return;
      killActive();
      tb.contentEditable = 'false';
      hideMascot('mascot');
      step3_BloqueBasico();
    }
  }, { signal: sig });
}

/* ==========================================================
   PASO 3 — Insertar bloque básico con /
   ========================================================== */
function step3_BloqueBasico() {
  killActive();

  if (document.activeElement) document.activeElement.blur();

  const hint = document.getElementById('slashHint1');
  hint.classList.remove('hidden');
  hint.style.cursor = 'pointer';

  showMascot(
    '⚡ ¡Hora de la magia! Presiona <b>/</b> en tu teclado<br>para abrir el menú de bloques.<br><small>O haz clic en el texto gris de abajo.</small>',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  function openBasicMenu() {
    // FIX: killActive antes de abrir el menú para evitar listeners duplicados
    killActive();
    hint.classList.add('hidden');
    hint.style.cursor = '';
    hint.onclick = null;
    hideMascot('mascot');

    openSlashMenu(
      ['📝 Texto', '📋 Lista con viñetas', '☑️ Lista de tareas', '❝ Cita'],
      'BLOQUES BÁSICOS',
      (picked) => {
        const label = picked.replace(/^\S+\s+/, '');
        insertEditableBlock(label, () => step4_BloqueMultimedia());
      }
    );
  }

  hint.onclick = () => openBasicMenu();
  onSlashKey(sig, openBasicMenu);
}

// FIX: helper para saber si el usuario está escribiendo en un campo editable
function isEditableActive() {
  const ae = document.activeElement;
  if (!ae || ae === document.body) return false;
  if (ae.contentEditable === 'true') return true;
  if (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') return true;
  return false;
}

// FIX: wrapper seguro para registrar listener de /
// Garantiza que solo haya 1 listener activo a la vez
function onSlashKey(sig, callback) {
  if (_slashListening) return; // ya hay uno activo
  _slashListening = true;
  document.addEventListener('keydown', function kHandler(e) {
    if (e.key !== '/') return;
    if (isEditableActive()) return; // el usuario está escribiendo, ignorar
    e.preventDefault();
    _slashListening = false;
    document.removeEventListener('keydown', kHandler);
    callback();
  }, { signal: sig });
  // Cuando el AbortController aborte, limpiar el flag también
  sig.addEventListener('abort', () => { _slashListening = false; });
}

/* Inserta un div editable y espera que el usuario escriba algo + Enter */
function insertEditableBlock(label, onConfirm) {
  const container = document.getElementById('blocksContainer');
  const block = document.createElement('div');
  block.className = 'inserted-block';
  block.contentEditable = 'true';
  block.setAttribute('data-label', label);
  container.appendChild(block);
  setTimeout(() => block.focus(), 50);

  showMascot(
    `🎉 ¡Perfecto! Creaste un bloque <b>"${label}"</b>.<br>Escribe algo y presiona <b>Enter</b> para continuar.`,
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  block.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (block.textContent.trim().length === 0) return;
      killActive();
      block.contentEditable = 'false';
      hideMascot('mascot');
      onConfirm();
    }
  }, { signal: sig });
}

/* ==========================================================
   PASO 4 — Bloque multimedia
   ========================================================== */
function step4_BloqueMultimedia() {
  killActive();
  setProgress(2);

  if (document.activeElement) document.activeElement.blur();

  const container = document.getElementById('blocksContainer');
  const hint = document.createElement('div');
  hint.className = 'slash-hint';
  hint.id = 'slashHint2';
  hint.textContent = 'Escribe / para insertar un bloque multimedia';
  hint.style.cursor = 'pointer';
  container.appendChild(hint);

  showMascot(
    '🤩 ¡Genial! Ahora presiona <b>/</b> para insertar<br>una imagen, video, audio o archivo.',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  function openMediaMenu() {
    killActive();
    hint.remove();
    hideMascot('mascot');

    openSlashMenu(
      ['🖼️ Imagen', '🎬 Video', '🎵 Audio', '📎 Archivo'],
      'CONTENIDO MULTIMEDIA',
      (picked) => insertMediaBlock(picked)
    );
  }

  hint.onclick = () => openMediaMenu();

  onSlashKey(sig, openMediaMenu);
}

function insertMediaBlock(label) {
  const container = document.getElementById('blocksContainer');
  let b;

  if (label.includes('Imagen')) {
    b = document.createElement('div');
    b.className = 'media-block';
    b.style.background = 'linear-gradient(135deg,#F2A65A,#B5651D)';
    b.textContent = '🖼️';
  } else if (label.includes('Video')) {
    b = document.createElement('div');
    b.className = 'media-block';
    b.style.background = 'linear-gradient(135deg,#5A7D9A,#2C3E50)';
    b.textContent = '▶️';
  } else if (label.includes('Audio')) {
    b = document.createElement('div');
    b.className = 'media-block';
    b.style.background = 'linear-gradient(135deg,#6C3FBF,#B388EB)';
    b.textContent = '🎵';
  } else {
    b = document.createElement('div');
    b.className = 'file-block';
    b.innerHTML = '<div class="line" style="width:60%"></div><div class="line" style="width:90%"></div><div class="line" style="width:40%"></div>';
  }
  container.appendChild(b);
  setTimeout(() => step5_BaseDeDatos(), 700);
}

/* ==========================================================
   PASO 5 — Base de datos
   ========================================================== */
function step5_BaseDeDatos() {
  killActive();
  setProgress(3);

  if (document.activeElement) document.activeElement.blur();

  const container = document.getElementById('blocksContainer');
  const hint = document.createElement('div');
  hint.className = 'slash-hint';
  hint.id = 'slashHint3';
  hint.textContent = 'Escribe / para crear una base de datos';
  hint.style.cursor = 'pointer';
  container.appendChild(hint);

  showMascot(
    '😅 ¡Nos falta el último súper poder!<br>Una <b>Base de Datos</b> en Notion es como Excel,<br>pero cada fila es una página completa.<br>Presiona <b>/</b> para crearla.',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  function openDBMenu() {
    killActive();
    hint.remove();
    hideMascot('mascot');

    openSlashMenu(
      ['🗄️ Nueva base de datos', '📑 Nueva fuente vacía'],
      'BASE DE DATOS',
      () => openTableView()
    );
  }

  hint.onclick = () => openDBMenu();

  onSlashKey(sig, openDBMenu);
}

function openTableView() {
  killActive();

  // FIX: ocultar workspaceView correctamente
  document.getElementById('workspaceView').style.display = 'none';
  const tv = document.getElementById('tableView');
  tv.classList.add('active');

  const dbTitle = document.getElementById('dbTitle');
  dbTitle.contentEditable = 'true';
  dbTitle.textContent = '';

  showMascot('👊 ¡Ponle un nombre a tu base de datos!<br>Escríbelo y presiona <b>Enter</b>.', 'mascot');

  setTimeout(() => dbTitle.focus(), 100);

  activeController = new AbortController();
  const sig = activeController.signal;

  dbTitle.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (dbTitle.textContent.trim().length === 0) return;
      killActive();
      dbTitle.contentEditable = 'false';
      hideMascot('mascot');
      step5b_RellenarFila();
    }
  }, { signal: sig });
}

function step5b_RellenarFila() {
  killActive();

  const colHeader = document.getElementById('colNameHeader');
  const cell1     = document.getElementById('cell1');
  colHeader.contentEditable = 'true';
  cell1.contentEditable = 'true';

  showMascot(
    '¡Bien! Escribe el primer dato en la celda.<br>Presiona <b>Enter</b> para continuar.',
    'mascot'
  );

  setTimeout(() => cell1.focus(), 100);

  activeController = new AbortController();
  const sig = activeController.signal;

  cell1.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cell1.textContent.trim().length === 0) return;
      killActive();
      colHeader.contentEditable = 'false';
      cell1.contentEditable = 'false';
      hideMascot('mascot');
      showMascot('🎉 ¡Listo! Base de datos creada.<br>Haz clic en el botón para volver a tu página.', 'mascot');
      document.getElementById('backToPageBtn').classList.add('show');
    }
  }, { signal: sig });
}

document.getElementById('backToPageBtn').addEventListener('click', () => {
  hideMascot('mascot');
  document.getElementById('tableView').classList.remove('active');
  // FIX: restaurar workspaceView correctamente con su clase has-progress
  const wv = document.getElementById('workspaceView');
  wv.style.display = 'flex';
  wv.classList.add('has-progress');
  document.getElementById('backToPageBtn').classList.remove('show');
  step6_VincularDB();
});

/* ==========================================================
   PASO 6 — Vincular BD en la página
   ========================================================== */
function step6_VincularDB() {
  killActive();
  setProgress(4);

  if (document.activeElement) document.activeElement.blur();

  const container = document.getElementById('blocksContainer');
  const hint = document.createElement('div');
  hint.className = 'slash-hint';
  hint.id = 'slashHint4';
  hint.textContent = 'Escribe / para vincular tu base de datos aquí';
  hint.style.cursor = 'pointer';
  container.appendChild(hint);

  showMascot('¡Hora de meter tu base de datos en la página!<br>Presiona <b>/</b> para vincularla.', 'mascot');

  activeController = new AbortController();
  const sig = activeController.signal;

  function openLinkMenu() {
    killActive();
    hint.remove();
    hideMascot('mascot');

    openSlashMenu(
      ['🔗 Vincular a fuente de datos existente'],
      'VINCULAR',
      () => {
        insertDatabaseInline();
        setTimeout(() => step7_DragDrop(), 500);
      }
    );
  }

  hint.onclick = () => openLinkMenu();

  onSlashKey(sig, openLinkMenu);
}

function insertDatabaseInline() {
  const container = document.getElementById('blocksContainer');
  const colName = document.getElementById('colNameHeader').textContent.trim() || 'Nombre';
  const colVal  = document.getElementById('cell1').textContent.trim() || 'Elemento 1';
  const dbName  = document.getElementById('dbTitle').textContent.trim() || 'Mi Base de Datos';

  const wrap = document.createElement('div');
  wrap.className = 'db-inline';
  wrap.innerHTML = `<table>
    <tr><th colspan="2">🗄️ ${dbName}</th></tr>
    <tr><th>${colName}</th><th>Propiedad</th></tr>
    <tr><td>${colVal}</td><td>—</td></tr>
  </table>`;
  container.appendChild(wrap);
}

/* ==========================================================
   PASO 7 — Drag & Drop  (FIXED v2: Pointer Events)
   El Drag&Drop nativo de HTML5 (dragstart/dragover/drop) tenía dos bugs
   reales: (1) nunca llamaba a e.dataTransfer.setData(), lo que hace que
   Firefox cancele el drag silenciosamente, y (2) no funciona en pantallas
   táctiles porque está basado solo en eventos de mouse. Pointer Events
   resuelve ambos: el mismo código funciona igual con mouse, trackpad y dedo.
   ========================================================== */
function step7_DragDrop() {
  killActive();

  const container = document.getElementById('blocksContainer');

  // Envolver cada bloque con un handle de arrastre.
  // FIX: movemos el nodo real (b.before + row.appendChild(b)) en vez de
  // clonarlo — clonar perdía estilos inline (ej. el gradiente de los
  // bloques multimedia) porque esos vivían en el propio nodo, no en hijos.
  Array.from(container.children).forEach(b => {
    if (b.classList && b.classList.contains('block-row')) return;
    const row = document.createElement('div');
    row.className = 'block-row drop-zone';
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.title = 'Arrastra este bloque';
    handle.innerHTML = '⠿';
    b.before(row);
    row.appendChild(handle);
    row.appendChild(b);
  });

  showMascot(
    'Arrastra cualquier bloque usando el icono <b>⠿</b> que aparece a la izquierda.<br><b>Suéltalo en otro bloque para continuar.</b>',
    'mascot'
  );

  activeController = new AbortController();
  const sig = activeController.signal;

  let dragRow = null;
  let dropped = false;

  // Devuelve el drop-zone justo debajo del punto Y dado (para insertar antes de él)
  function rowAfterPoint(y) {
    const rows = Array.from(container.querySelectorAll('.drop-zone:not(.dragging)'));
    let closest = null;
    let closestOffset = -Infinity;
    rows.forEach(r => {
      const box = r.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = r;
      }
    });
    return closest;
  }

  function clearOver() {
    container.querySelectorAll('.drop-zone.over').forEach(z => z.classList.remove('over'));
  }

  function finishStep() {
    killActive();
    hideMascot('mascot');
    setTimeout(() => step8_Portada(), 300);
  }

  function endDrag(e) {
    if (!dragRow) return;
    const after = rowAfterPoint(e.clientY);
    clearOver();

    if (after && after !== dragRow) {
      container.insertBefore(dragRow, after);
      dropped = true;
    } else if (!after) {
      const rows = Array.from(container.querySelectorAll('.drop-zone'));
      if (rows[rows.length - 1] !== dragRow) {
        container.appendChild(dragRow);
        dropped = true;
      }
    }

    dragRow.classList.remove('dragging');
    dragRow = null;

    if (dropped) finishStep();
  }

  container.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragRow = handle.closest('.drop-zone');
      if (!dragRow) return;
      dragRow.classList.add('dragging');
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    }, { signal: sig });
  });

  document.addEventListener('pointermove', (e) => {
    if (!dragRow) return;
    clearOver();
    const rows = Array.from(container.querySelectorAll('.drop-zone:not(.dragging)'));
    const target = rowAfterPoint(e.clientY) || rows[rows.length - 1];
    if (target) target.classList.add('over');
  }, { signal: sig });

  document.addEventListener('pointerup', endDrag, { signal: sig });
  document.addEventListener('pointercancel', endDrag, { signal: sig });
}

/* ==========================================================
   PASO 8 — Agregar portada
   ========================================================== */
function step8_Portada() {
  killActive();

  const coverArea   = document.getElementById('coverArea');
  const addCoverBtn = document.getElementById('addCoverBtn');

  coverArea.classList.add('show-btn');

  // FIX: hacer scroll al tope del doc-canvas para que el botón sea visible
  const canvas = document.getElementById('docCanvas');
  canvas.scrollTo({ top: 0, behavior: 'smooth' });

  showMascot(
    '⭐ ¡Último paso! Haz clic en el botón<br><b>"+ Agregar portada"</b> que aparece arriba del canvas.',
    'mascot'
  );

  // FIX: clonar para limpiar cualquier listener previo (correcto, mantener)
  const newBtn = addCoverBtn.cloneNode(true);
  addCoverBtn.parentNode.replaceChild(newBtn, addCoverBtn);

  newBtn.addEventListener('click', () => {
    coverArea.classList.add('has-cover');
    coverArea.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
    coverArea.classList.remove('show-btn');
    hideMascot('mascot');
    step9_Final();
  });
}

/* ==========================================================
   PASO 9 — Gran final
   ========================================================== */
function step9_Final() {
  killActive();
  setProgress(4);

  // FIX: desbloquear sidebar ANTES de pedirle al usuario que haga clic en él
  sidebar.classList.remove('locked');

  showMascot(
    '🚀 ¡Y listo! Ya dominas los bloques de Notion.<br>Haz clic en <b>"Nueva página"</b> en el sidebar para terminar.',
    'mascot'
  );

  // FIX: ya no clonamos el botón — sbNewPageBtn tiene un listener permanente
  // (ver handleSidebarNewPageClick) que detecta esta clase 'blink' para saber
  // que debe terminar el onboarding en vez de abrir una página nueva normal.
  const sbBtn = document.getElementById('sbNewPageBtn');
  if (sbBtn) sbBtn.classList.add('blink');
}

/* ==========================================================
   FINISH
   ========================================================== */
function finishOnboarding() {
  killActive();
  document.querySelectorAll('.mascot-wrap, .floating-menu').forEach(e => e.remove());

  const pw = document.getElementById('progressWidget');
  pw.classList.remove('active');

  // FIX: remover clase has-progress del workspaceView
  document.getElementById('workspaceView').classList.remove('has-progress');
  mainPanel.classList.remove('tutorial-active');

  sidebar.classList.remove('locked');

  // FIX: quitar blink de cualquier elemento que lo tenga
  document.querySelectorAll('.blink').forEach(b => b.classList.remove('blink'));

  renderFinalPage();
}

/* ==========================================================
   FASE 5 — Página limpia final
   ========================================================== */
function renderFinalPage() {
  docCanvas.innerHTML = `
    <div class="title-block" style="color:var(--text);">Nueva página</div>
    <div class="slash-hint">Escribe / para ver comandos</div>
    <div class="quick-actions">
      <div class="qa-btn">✨ Preguntar a la IA</div>
      <div class="qa-btn">📝 Anotador con IA</div>
      <div class="qa-btn">📅 Base de datos</div>
      <div class="qa-btn">📋 Formulario</div>
    </div>
    <div class="dashed-box" style="margin-top:24px;">
      <div class="ttl">(ESCRIBE EL TÍTULO DE TU PRIMER PROYECTO)</div>
    </div>
    <div class="dashed-box">
      <div class="checklist-item"><label><input type="checkbox"> Define el objetivo de tu proyecto</label></div>
      <div class="checklist-item"><label><input type="checkbox"> Agrega a los miembros de tu equipo</label></div>
      <div class="checklist-item"><label><input type="checkbox"> Establece una fecha límite</label></div>
      <div class="checklist-item"><label><input type="checkbox"> Escribe tu primera nota</label></div>
      <div class="checklist-hint">(PRESIONA / PARA INSERTAR MÁS BLOQUES...)</div>
    </div>
  `;
}

/* ==========================================================
   GESTIÓN DE PÁGINAS — hace funcionales "Nueva página" y
   "+ Agregar página" del sidebar, antes muertos.
   ========================================================== */
function isTutorialActive() {
  return document.getElementById('progressWidget').classList.contains('active');
}

function openFreshPage() {
  showView('workspace');
  document.getElementById('workspaceView').style.display = 'flex';
  renderFinalPage();
}

function openBlankPage(title) {
  showView('workspace');
  document.getElementById('workspaceView').style.display = 'flex';
  docCanvas.innerHTML = `
    <div class="title-block" contenteditable="true" data-placeholder="Sin título"></div>
    <div class="slash-hint">Escribe / para ver comandos</div>
    <div class="quick-actions">
      <div class="qa-btn">✨ Preguntar a la IA</div>
      <div class="qa-btn">📝 Anotador con IA</div>
      <div class="qa-btn">📅 Base de datos</div>
      <div class="qa-btn">📋 Formulario</div>
    </div>
  `;
  if (title) docCanvas.querySelector('.title-block').textContent = title;
  setTimeout(() => docCanvas.querySelector('.title-block').focus(), 50);
}

// "Nueva página" del sidebar (Recientes y Privado) — fuera del tutorial,
// simplemente abre una página nueva en blanco. Durante el tutorial, conserva
// su rol original de disparar el final del onboarding (clase .blink).
function handleSidebarNewPageClick(e) {
  if (isTutorialActive()) {
    if (e.currentTarget.classList.contains('blink')) finishOnboarding();
    return;
  }
  openFreshPage();
}
['sbNewPageBtn', 'sbRecentNewPage'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', handleSidebarNewPageClick);
});

// "+ Agregar página" — crea una página en blanco y la añade a "Privado"
document.getElementById('addPageBtn').addEventListener('click', () => {
  if (isTutorialActive()) {
    notify('Termina el tutorial antes de crear páginas nuevas.');
    return;
  }
  const item = document.createElement('div');
  item.className = 'sb-item sb-added-item';
  item.textContent = '📄 Página sin título';
  item.addEventListener('click', () => openBlankPage(item.textContent.replace('📄 ', '')));
  document.getElementById('addedItemsContainer').appendChild(item);
  openBlankPage();
});

// Botones ✨ / 📝 / 📅 / 📋 de la fila "quick-actions" — funcionan en
// cualquier página (la inicial, la final y las páginas en blanco nuevas)
// gracias a la delegación de eventos sobre mainPanel.
mainPanel.addEventListener('click', (e) => {
  const btn = e.target.closest('.qa-btn');
  if (!btn || isTutorialActive()) return;
  notify(`${btn.textContent.trim()}: función simulada en este prototipo.`);
});

// "Compartir" en la topbar
const shareBtn = document.querySelector('.topbar .share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', () =>
    notify('Enlace para compartir copiado (simulado en este prototipo).')
  );
}

/* ── Resto de botones decorativos del sidebar (antes muertos) ── */
const SIDEBAR_ACTION_MESSAGES = {
  home:          'Esta función no está disponible en este prototipo.',
  chat:          'El chat de Notion no está disponible en este prototipo.',
  edit:          'Esta función no está disponible en este prototipo.',
  inbox:         'Tu bandeja de entrada no está disponible en este prototipo.',
  search:        'La búsqueda no está disponible en este prototipo.',
  mail:          'Notion Mail no está disponible en este prototipo.',
  calendar:      'Notion Calendar no está disponible en este prototipo.',
  'desktop-app': 'La app de escritorio no está disponible en este prototipo.',
  library:       'La Biblioteca no está disponible en este prototipo.',
  tasks:         'Tus tareas no están disponibles en este prototipo.',
  help:          'El centro de ayuda no está disponible en este prototipo.',
  trash:         'La papelera está vacía.',
  'new-chat':    'El chat con IA no está disponible en este prototipo.',
};
sidebar.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || isTutorialActive()) return;
  const msg = SIDEBAR_ACTION_MESSAGES[el.dataset.action];
  if (msg) notify(msg);
});

/* ==========================================================
   FASE 6 — MARKETPLACE
   ========================================================== */
const VIEWS = {
  workspace: document.getElementById('workspaceView'),
  mkt:       document.getElementById('mktView'),
  detail:    document.getElementById('detailView'),
  preview:   document.getElementById('fullPreviewView'),
};

function showView(name) {
  // FIX: también ocultar tableView cuando se cambia de vista
  const tv = document.getElementById('tableView');
  if (tv) tv.classList.remove('active');

  VIEWS.workspace.style.display = name === 'workspace' ? 'flex' : 'none';
  VIEWS.mkt.classList.toggle('active',     name === 'mkt');
  VIEWS.detail.classList.toggle('active',  name === 'detail');
  VIEWS.preview.classList.toggle('active', name === 'preview');
}
showView('workspace');

document.getElementById('goMarketplace').addEventListener('click', () => openMarketplace());
document.getElementById('backToMktFromDetail').addEventListener('click', () => openMarketplace());
document.getElementById('backFromPreview').addEventListener('click', () => showView('detail'));

/* ── TEMPLATES ── */
const TEMPLATES = {
  work: [
    { id:'pm',     title:'Gestor de Proyectos Completo', desc:'Dashboard integral de tareas, clientes y métricas.',              cover:'linear-gradient(135deg,#2383E2,#0B4A8C)', icon:'🎯' },
    { id:'office', title:'Oficina Virtual Avanzada',      desc:'Documentación corporativa y OKRs centralizados.',                cover:'linear-gradient(135deg,#787774,#383838)', icon:'🏢' },
    { id:'kanban', title:'Dirección de Proyectos V1',     desc:'Tableros Kanban organizados por estados de entrega.',            cover:'linear-gradient(135deg,#2E7D52,#16432B)', icon:'📋' },
  ],
  personal: [
    { id:'fit',      title:'Queen Fit Tracker',            desc:'Actividad física, rutinas divididas y control calórico.',        cover:'linear-gradient(135deg,#B388EB,#6C3FBF)', icon:'🏋️‍♀️' },
    { id:'recetas',  title:'Recetario Inteligente',        desc:'Inventario de cocina con visuales de platillos.',               cover:'linear-gradient(135deg,#F2A65A,#B5651D)', icon:'🥑' },
    { id:'biblio_p', title:'Biblioteca Virtual Personal',  desc:'Registro estético de lecturas y autores.',                      cover:'linear-gradient(135deg,#5A7D9A,#2C3E50)', icon:'📚' },
  ],
  student: [
    { id:'examen',         title:'Panel de Preparación',   desc:'Cronograma con pomodoro y seguimiento de temas.',               cover:'linear-gradient(135deg,#E2B93B,#8C6A0B)', icon:'⏱️' },
    { id:'dashboard_acad', title:'Dashboard Académico',    desc:'Clases, créditos y entregables integrados.',                    cover:'linear-gradient(135deg,#C75146,#6E1E14)', icon:'🎓' },
    { id:'biblio',         title:'Control de Lecturas',    desc:'Base de datos con resúmenes, citas y estados.',                 cover:'linear-gradient(135deg,#3E8E7E,#1B4F47)', icon:'📖' },
  ],
};

function openMarketplace(seg) {
  if (document.getElementById('progressWidget').classList.contains('active')) {
    finishOnboarding();
  }
  showView('mkt');
  const useSeg = seg || 'all';
  document.querySelectorAll('.cat-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.seg === useSeg)
  );
  renderTemplates(useSeg);
}

document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const search = document.querySelector('.mkt-search input');
    if (search) search.value = '';
    openMarketplace(pill.dataset.seg);
  });
});

// Búsqueda en vivo dentro del Marketplace (antes el input no hacía nada)
const mktSearchInput = document.querySelector('.mkt-search input');
if (mktSearchInput) {
  mktSearchInput.addEventListener('input', () => {
    const q = mktSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('#templateGrid .tpl-card').forEach(card => {
      const title = card.querySelector('.title').textContent.toLowerCase();
      card.style.display = title.includes(q) ? '' : 'none';
    });
  });
}

function renderTemplates(filterSeg) {
  const grid = document.getElementById('templateGrid');
  grid.innerHTML = '';
  const labels = { work:'Trabajo', personal:'Personal', student:'Educación' };
  let seg;
  if (filterSeg === 'all' || !filterSeg) {
    seg = USER_SEGMENT || 'personal';
    document.getElementById('segmentSub').textContent = `Recomendadas para tu perfil (${labels[seg]})`;
  } else {
    seg = filterSeg;
    document.getElementById('segmentSub').textContent = `Plantillas de ${labels[seg]}`;
  }
  TEMPLATES[seg].forEach(t => {
    const card = document.createElement('div');
    card.className = 'tpl-card';
    card.innerHTML = `<div class="tpl-cover" style="background:${t.cover}"></div>
      <div class="tpl-info"><div class="title">${t.title}</div><div class="desc">${t.desc}</div></div>`;
    card.addEventListener('click', () => openDetail(seg, t.id));
    grid.appendChild(card);
  });
}

let currentTpl = null, currentSeg = null;

function openDetail(seg, id) {
  currentSeg = seg;
  currentTpl = TEMPLATES[seg].find(t => t.id === id);
  if (!currentTpl) return; // FIX: guard por si no encuentra la plantilla
  showView('detail');
  const names    = { work:'Keyzzer Mayorca', personal:'Camila Studio', student:'Josecarlos de Lima' };
  const initials = { work:'KM', personal:'CS', student:'JC' };
  document.getElementById('detailCreator').innerHTML =
    `<div class="avatar">${initials[seg]}</div> ${names[seg]}`;
  document.getElementById('detailTitleLeft').textContent = currentTpl.title;
  document.getElementById('detailDescLeft').textContent  =
    currentTpl.desc + ' Incluye estructura lista para usar, con bloques, tablas y vistas ya configuradas.';
  document.getElementById('miniFrame').innerHTML =
    `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:${currentTpl.cover};color:#fff;font-size:48px;">${currentTpl.icon}</div>`;
}

document.getElementById('previewTemplateBtn').addEventListener('click', () => {
  if (!currentTpl) return; // FIX: guard
  showView('preview');
  document.getElementById('fullPreviewContent').innerHTML = buildPreviewHTML(currentSeg, currentTpl);
});

document.getElementById('addTemplateBtn').addEventListener('click', () => {
  if (!currentTpl) return; // FIX: guard
  addTemplateToSidebar();
});

function buildPreviewHTML(seg, tpl) {
  const head = `<div class="detail-cover" style="background:${tpl.cover};"></div>
    <div class="detail-head">
      <div class="detail-icon">${tpl.icon}</div>
      <div class="detail-title-big">${tpl.title.toUpperCase()}</div>
    </div>`;

  if (seg === 'work') return head + `
    <div class="color-blocks">
      <div class="cblock yellow-bg"><h4>TAREAS SIN PROGRAMAR</h4><ul>
        <li>Llamada con cliente Gabriel</li><li>Revisar propuesta Q3</li><li>Enviar factura</li>
      </ul></div>
      <div class="cblock blue-bg"><h4>NOTAS RÁPIDAS</h4><ul>
        <li>Mejorar el brief</li><li>Pedir feedback</li><li>Actualizar guía de marca</li>
      </ul></div>
      <div class="cblock green-bg"><h4>NO OLVIDAR</h4><ul>
        <li>Revisar métricas semanal</li><li>Programar reunión de seguimiento</li>
      </ul></div>
    </div>`;

  if (seg === 'personal') return head + `
    <div class="color-blocks">
      <div class="cblock lila-bg"><h4>▶ RUTINA SUPERIOR</h4><ul>
        <li>Press banca 4x10</li><li>Remo con barra 4x12</li><li>Press militar 3x10</li>
      </ul></div>
      <div class="cblock lila-bg"><h4>▶ RUTINA CORE</h4><ul>
        <li>Plancha 3x40s</li><li>Crunch bicicleta 3x20</li><li>Elevación piernas 3x15</li>
      </ul></div>
      <div class="cblock lila-bg"><h4>▶ RUTINA INFERIOR</h4><ul>
        <li>Sentadilla 4x10</li><li>Peso muerto 4x8</li><li>Zancadas 3x12</li>
      </ul></div>
    </div>
    <div class="gallery">
      <div class="gcard"><div class="img" style="background:linear-gradient(135deg,#F2A65A,#B5651D)"></div><div class="lbl">Chuletas a la naranja</div></div>
      <div class="gcard"><div class="img" style="background:linear-gradient(135deg,#E8C39E,#A9745B)"></div><div class="lbl">Budín de plátano</div></div>
      <div class="gcard"><div class="img" style="background:linear-gradient(135deg,#9BC53D,#5C8001)"></div><div class="lbl">Ensalada mediterránea</div></div>
      <div class="gcard"><div class="img" style="background:linear-gradient(135deg,#E07A5F,#81322E)"></div><div class="lbl">Salmón al horno</div></div>
    </div>`;

  if (tpl.id === 'examen') return head + `
    <div class="pomodoro">⏱️ <div class="clock">25:00</div> Sesión — Cálculo II</div>
    <div class="color-blocks">
      <div class="cblock yellow-bg"><h4>PENDIENTES</h4><ul><li>Integrales</li><li>Series de Taylor</li></ul></div>
      <div class="cblock green-bg"><h4>DOMINADOS</h4><ul><li>Límites</li><li>Derivadas implícitas</li></ul></div>
      <div class="cblock blue-bg"><h4>RECURSOS</h4><ul><li>Guía de ejercicios</li><li>Videos</li></ul></div>
    </div>`;

  if (tpl.id === 'dashboard_acad') return head + `
    <div class="color-blocks">
      <div class="cblock yellow-bg"><h4>HORARIO</h4><ul><li>Lunes: Cálculo II 8am</li><li>Martes: BD 10am</li></ul></div>
      <div class="cblock blue-bg"><h4>CRÉDITOS</h4><ul><li>Inscritos: 18</li><li>Aprobados: 96</li></ul></div>
      <div class="cblock green-bg"><h4>ENTREGABLES</h4><ul><li>Informe Econ. 20 jun</li><li>Proyecto BD 28 jun</li></ul></div>
    </div>`;

  return head + `
    <div class="color-blocks" style="align-items:flex-start;">
      <div class="cblock yellow-bg" style="flex:0 0 200px;">
        <h4>Leyendo</h4>
        <div style="height:80px;border-radius:6px;background:linear-gradient(135deg,#C75146,#6E1E14);margin-bottom:8px;"></div>
        <div style="font-weight:600;font-size:13px;">Exilio de Amor</div>
        <div style="font-size:12px;color:var(--text-muted);">Josecarlos Escobar</div>
      </div>
      <div class="cblock" style="background:#fff;border:1px solid var(--border);flex:2;">
        <h4>All Books</h4>
        <table class="lib-table">
          <tr><th>Título</th><th>Autor</th><th>Año</th><th>Estado</th></tr>
          <tr><td>🇵🇪 Exilio de Amor</td><td>Josecarlos Escobar</td><td>2024</td><td><span class="status-pill status-azul">Leyendo</span></td></tr>
          <tr><td>🇪🇸 Cien Años de Soledad</td><td>García Márquez</td><td>1967</td><td><span class="status-pill status-verde">Leído</span></td></tr>
          <tr><td>🇨🇱 Veinte Poemas de Amor</td><td>Pablo Neruda</td><td>1924</td><td><span class="status-pill status-gris">Sin empezar</span></td></tr>
        </table>
      </div>
    </div>`;
}

function addTemplateToSidebar() {
  const item = document.createElement('div');
  item.className = 'sb-item sb-added-item';
  item.textContent = `${currentTpl.icon} ${currentTpl.title}`;
  document.getElementById('addedItemsContainer').appendChild(item);
  showToast(currentTpl.title);
}

function showToast(name) {
  notify(`'${name}' agregada a tu espacio de trabajo.`, {
    actionLabel: 'Ver ahora',
    duration: 5000,
    onAction: () => {
      if (currentTpl) {
        showView('preview');
        document.getElementById('fullPreviewContent').innerHTML = buildPreviewHTML(currentSeg, currentTpl);
      }
    }
  });
}

/* ── ARRANQUE fallback ── */
if (!document.getElementById('fase0')) {
  startTutorial();
}
