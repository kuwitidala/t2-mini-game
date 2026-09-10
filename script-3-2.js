/* =========================================================
   TELE2 · СИМУЛЯТОР ИНЖЕНЕРА — ЛОГИКА ИГРЫ
   Файл не минифицирован специально — так удобнее дорабатывать.
   Все картинки объектов лежат в /assets и являются заглушками:
   просто замени файлы с теми же именами на финальный арт.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     ДАННЫЕ И НАСТРОЙКИ
     --------------------------------------------------------- */
  const POWER_STOPS = [12, 24, 36, 48, 72];
  const POWER_CORRECT_INDEX = 3; // соответствует 48
  const POWER_MESSAGES = [
    `Питание критически низкое <img class="radio-icon" src="assets/icons/warning.svg">`,
    "Питание слишком низкое",
    "Почти, но всё ещё маловато",
    `Питание в норме <img class="radio-icon" src="assets/icons/complete.svg">`,
    `Питание слишком высокое <img class="radio-icon" src="assets/icons/warning.svg">`
  ];

  const LEFT_LABELS = ["DATA", "RF", "POWER"];
  const RIGHT_LABELS = ["ANT", "DATA", "PWR"];
  // какому правому разъёму должен соответствовать каждый левый (по значению, не по цвету)
  const CORRECT_RIGHT_FOR_LEFT = LEFT_LABELS.map((label) => {
    const map = { DATA: "DATA", RF: "ANT", POWER: "PWR" };
    return RIGHT_LABELS.indexOf(map[label]);
  });
  const WIRE_COLORS = ["#a7fc00", "#00bfff", "#ff3495"];

  const CIRCUIT_CORRECT = ["power", "radio", "antenna", "network"];
  const CIRCUIT_LABELS = {
    power: `<img src="assets/icons/battery.svg"> ПИТАНИЕ`,
    radio: `<img src="assets/icons/power.svg"> РАДИО-МОДУЛЬ`,
    antenna: `<img src="assets/icons/tower.svg"> АНТЕННА`,
    network: `<img class="t2-logo" src="assets/icons/t2_Logo_White_sRGB.svg"> СЕТЬ`
  };

  const BONUSES = [
    "100 минут разговоров",
    "200 минут разговоров",
    "300 минут разговоров",
    "400 минут разговоров",
    "1 ГБ интернета",
    "2 ГБ интернета",
    "3 ГБ интернета",
  ];

  /* ---------------------------------------------------------
     СОСТОЯНИЕ ИГРЫ
     --------------------------------------------------------- */
  const state = {
    introDone: false,
    towerVisited: false,
    equipmentVisited: false,
    equipmentIntroShown: false,

    powerIndex: 1,           // старт на "24"
    moduleOn: false,

    wireAssignment: [0, 1, 2], // перестановка: left-индекс -> right-сокет
    wiresSolved: false,

    circuitOrder: ["power", "radio", "antenna", "network"], // будет перемешан при открытии
    circuitSolved: false,

    dragCircuit: null, // текущее перетаскивание карточки финальной цепи
    dragWire: null      // текущее перетаскивание штекера
  };

  /* ---------------------------------------------------------
     ХЕЛПЕРЫ
     --------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("is-active"));
    $("#" + id).classList.add("is-active");
  }

  function powerCorrect() {
    return state.powerIndex === POWER_CORRECT_INDEX;
  }
  function equipmentDone() {
    return powerCorrect() && state.moduleOn;
  }
  function correctWireCount() {
    return state.wireAssignment.filter((v, i) => v === CORRECT_RIGHT_FOR_LEFT[i]).length;
  }

  function progress() {
    let p = 0;
    if (powerCorrect()) p += 15;
    if (state.moduleOn) p += 15;
    p += correctWireCount() * 10; // максимум 30
    if (state.circuitSolved) p += 40;
    return p;
  }

  function meterClass(p) {
    if (p >= 100) return "full";
    if (p >= 50) return "mid";
    return "";
  }

  /* ---------------------------------------------------------
     МАСКОТ: позиция (лево/право), поза (1/2), очередь реплик
     --------------------------------------------------------- */
  const mascotEl = $("#mascot");
  const mascotFigure = $("#mascot-figure");
  const mascotBubble = $("#mascot-bubble");
  const mascotText = $("#mascot-text");
  const bubbleContinue = $("#bubble-continue");
  const dialogueCatcher = $("#dialogue-catcher");
  const sceneEl = $("#scene");

  function setMascotPosition(position) {
    mascotEl.classList.remove("mascot--right", "mascot--left");
    mascotEl.classList.add("mascot--" + position);
  }
  function setMascotPose(poseNumber) {
    mascotFigure.src = "assets/mascot-pose-" + poseNumber + ".png";
  }
  function poseForPosition(position, index) {
    if (position === "left") return 3;
    return (index % 2) + 1;
  }
  function setMascotVisible(visible) {
    mascotEl.classList.toggle("is-visible", visible);
  }

  let sequence = null;

  // lines = [{ text, position: "left"|"right" }]
  function playSequence(lines, onComplete) {
    sequence = { lines: lines.slice(), index: 0, onComplete: onComplete || null };
    sceneEl.classList.add("scene-locked");
    dialogueCatcher.classList.add("is-active");
    bubbleContinue.style.display = "block";
    showCurrentLine();
  }

  function showCurrentLine() {
    const line = sequence.lines[sequence.index];
    setMascotPosition(line.position);
    setMascotPose(poseForPosition(line.position, sequence.index));
    setMascotVisible(true);
    mascotText.textContent = line.text;
    mascotBubble.classList.add("is-visible");
  }

  function advanceSequence() {
    if (!sequence) return;
    sequence.index += 1;
    if (sequence.index >= sequence.lines.length) {
      const cb = sequence.onComplete;
      sequence = null;
      sceneEl.classList.remove("scene-locked");
      dialogueCatcher.classList.remove("is-active");
      mascotBubble.classList.remove("is-visible");
      setMascotVisible(false);
      if (cb) cb();
    } else {
      showCurrentLine();
    }
  }
  dialogueCatcher.addEventListener("click", advanceSequence);

  function sayOnce(text, position) {
    if (sequence) return;
    const pos = position || "right";
    setMascotPosition(pos);
    setMascotPose(poseForPosition(pos, 0));

    setMascotVisible(true);
    bubbleContinue.style.display = "none";
    mascotText.textContent = text;
    mascotBubble.classList.add("is-visible");
    clearTimeout(sayOnce._t);
    sayOnce._t = setTimeout(() => {
      mascotBubble.classList.remove("is-visible");
      setMascotVisible(false);
    }, 6000);
  }

  /* ---------------------------------------------------------
     ПРОГРЕСС-БАР (верхний правый угол)
     --------------------------------------------------------- */
  function refreshProgressBar() {
    const p = progress();
    const fill = $("#progress-fill");
    fill.style.width = p + "%";
    fill.className = "progress-corner__fill " + meterClass(p);
    $("#progress-value").textContent = p + "%";
  }

  /* ---------------------------------------------------------
     ОБНОВЛЕНИЕ ИКОНОК НА СЦЕНЕ
     --------------------------------------------------------- */
  function refreshScene() {
    refreshProgressBar();

    $("#img-lightning").src = "assets/objects/lightning-" + (equipmentDone() ? "green" : "pink") + ".png";
    $("#img-house").src = "assets/objects/house-" + (state.wiresSolved ? "green" : "pink") + ".png";
    $("#img-tower").src = "assets/objects/tower-" + (state.wiresSolved ? "green" : "pink") + ".png";

    const houseUnlocked = state.towerVisited && state.equipmentVisited;
    $("#hotspot-house").classList.toggle("is-locked", !houseUnlocked);

    $("#final-stage-cta").classList.toggle("is-visible", state.wiresSolved && !state.circuitSolved);
  }

  /* ---------------------------------------------------------
     ОТКРЫТИЕ / ЗАКРЫТИЕ ОКОН
     --------------------------------------------------------- */
  function openOverlay(id) {
    sceneEl.classList.add("blurred");
    $(id).classList.add("is-active");
  }
  function closeOverlays() {
    sceneEl.classList.remove("blurred");
    $$(".overlay").forEach((o) => o.classList.remove("is-active"));
    $("#device-panel").classList.remove("is-visible");

    // если в мини-игре ещё шла реплика — обрываем её вместе с закрытием окна
    if (sequence) {
      sequence = null;
      sceneEl.classList.remove("scene-locked");
      dialogueCatcher.classList.remove("is-active");
    }
    clearTimeout(sayOnce._t);
    mascotBubble.classList.remove("is-visible");
    setMascotVisible(false);

    refreshScene();
  }

  /* ---------------------------------------------------------
     ВЫШКА: крупный план + тестер сигнала
     --------------------------------------------------------- */
  function openTower() {
    state.towerVisited = true;
    openOverlay("#overlay-tower");
    $("#tower-zoom-img").src = "assets/tower-" + (state.wiresSolved ? "green" : "pink") + ".png";
    $("#device-panel").classList.remove("is-visible");
    $("#device-art").src = "assets/minigame/signal-tester-idle.png";
    $("#device-reading").textContent = "Тестер молчит";
    $("#device-reading").className = "device-panel__reading";
    $("#btn-run-test").disabled = false;
    $("#btn-run-test").textContent = "Запустить проверку";

    setTimeout(() => {
      $("#device-panel").classList.add("is-visible");
    }, 300);

    refreshScene();
  }

  $("#btn-run-test").addEventListener("click", () => {
    const btn = $("#btn-run-test");
    btn.disabled = true;
    btn.textContent = "Сканирование…";
    $("#device-reading").textContent = "Сканирование…";
    $("#device-reading").className = "device-panel__reading";

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Проверить ещё раз";
      const good = state.wiresSolved;
      $("#device-art").src = "assets/minigame/signal-tester-" + (good ? "good" : "bad") + ".png";
      $("#device-reading").textContent = good ? "Сигнал в норме ✓" : "Сигнал слабый ⚠";
      $("#device-reading").className = "device-panel__reading" + (good ? " good" : "");

      if (!good && !sequence) {
        playSequence([
          {
            text: "Похоже, где-то плохой контакт. Загляни в щиток дома или осмотри радиооборудование, там поймем в чём дело.",
            position: "left"
          }
        ]);
      }
    }, 900);
  });

  $("#tower-back").addEventListener("click", closeOverlays);

  /* ---------------------------------------------------------
     РАДИООБОРУДОВАНИЕ: питание (слайдер) + радиомодуль
     --------------------------------------------------------- */
  function refreshEquipmentUI() {
    $("#power-slider").value = state.powerIndex;
    const msg = $("#voltage-msg");
    msg.innerHTML = POWER_MESSAGES[state.powerIndex];
    msg.className = "inline-msg" + (powerCorrect() ? " good" : "");

    $("#btn-restart-module").disabled = state.moduleOn;
    $("#btn-restart-module").innerHTML = state.moduleOn ? `Модуль в сети <img src="assets/icons/complete.svg">` : "Перезапустить модуль";
  }

  function openEquipment() {
    state.equipmentVisited = true;
    refreshEquipmentUI();
    $("#module-msg").textContent = "";
    openOverlay("#overlay-equipment");

    if (!state.equipmentIntroShown) {
      state.equipmentIntroShown = true;
      playSequence([
        {
          text: "Даже в суровых условиях связь должна оставаться стабильной От неё зависят важные вещи - учёба, медицина, связь с близкими.",
          position: "right"
        }
      ]);
    }
    refreshScene();
  }

  $("#power-slider").addEventListener("input", (e) => {
    state.powerIndex = Number(e.target.value);
    refreshEquipmentUI();
    refreshScene();
  });

  $("#btn-restart-module").addEventListener("click", () => {
    const btn = $("#btn-restart-module");
    btn.disabled = true;
    btn.textContent = "Перезапуск…";
    setTimeout(() => {
      state.moduleOn = true;
      refreshEquipmentUI();
      refreshScene();
      $("#module-msg").textContent = "Модуль снова передаёт сигнал.";
      $("#module-msg").className = "inline-msg good";
    }, 700);
  });

  $("#equipment-back").addEventListener("click", closeOverlays);

  /* ---------------------------------------------------------
     ПРОВОДА В ДОМЕ — штекеры тянем мышью/пальцем
     --------------------------------------------------------- */
  function shuffleWireAssignment() {
    let arr;
    do {
      arr = [0, 1, 2];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (arr.every((v, i) => v === CORRECT_RIGHT_FOR_LEFT[i]));
    return arr;
  }

  function wireSocketPositions() {
    const board = $("#wires-board");
    const rect = board.getBoundingClientRect();
    const ys = [0.2, 0.5, 0.8].map((f) => f * rect.height);
    // подписи (DATA/RF/POWER и ANT/DATA/PWR) стоят у края, ближе к разъёмам, и никогда не двигаются
    const labelLeftX = rect.width * 0.16;
    const labelRightX = rect.width * 0.84;
    // а сами разъёмы, куда цепляется провод, — чуть ближе к центру
    const anchorLeftX = rect.width * 0.28;
    const anchorRightX = rect.width * 0.72;
    return {
      rect,
      labelLeft: ys.map((y) => ({ x: labelLeftX, y })),
      labelRight: ys.map((y) => ({ x: labelRightX, y })),
      left: ys.map((y) => ({ x: anchorLeftX, y })),
      right: ys.map((y) => ({ x: anchorRightX, y }))
    };
  }

  function renderWires() {
    const board = $("#wires-board");
    $$(".wire-socket, .wire-anchor, .wire-plug", board).forEach((n) => n.remove());
    const svg = $("#wires-svg");
    svg.innerHTML = "";

    const pos = wireSocketPositions();

    // подписи слева — всегда на месте, отдельно от разъёмов
    LEFT_LABELS.forEach((label, i) => {
      const el = document.createElement("div");
      el.className = "wire-socket left";
      el.style.left = pos.labelLeft[i].x + "px";
      el.style.top = pos.labelLeft[i].y + "px";
      el.textContent = label;
      board.appendChild(el);

      const anchor = document.createElement("div");
      anchor.className = "wire-anchor left";
      anchor.style.left = pos.left[i].x + "px";
      anchor.style.top = pos.left[i].y + "px";
      board.appendChild(anchor);
    });

    // подписи справа — тоже всегда на месте и всегда видны
    RIGHT_LABELS.forEach((label, j) => {
      const el = document.createElement("div");
      el.className = "wire-socket right";
      el.style.left = pos.labelRight[j].x + "px";
      el.style.top = pos.labelRight[j].y + "px";
      el.textContent = label;
      board.appendChild(el);

      const anchor = document.createElement("div");
      anchor.className = "wire-anchor right";
      anchor.style.left = pos.right[j].x + "px";
      anchor.style.top = pos.right[j].y + "px";
      board.appendChild(anchor);
    });

    LEFT_LABELS.forEach((label, i) => {
      const plug = document.createElement("div");
      plug.className = "wire-plug";
      plug.style.background = WIRE_COLORS[i]; // точка всегда своего цвета (не зависит от правильности)
      plug.dataset.index = String(i);

      const isDragging = state.dragWire && state.dragWire.index === i;
      const socketIdx = state.wireAssignment[i];
      const x = isDragging ? state.dragWire.x : pos.right[socketIdx].x;
      const y = isDragging ? state.dragWire.y : pos.right[socketIdx].y;
      plug.style.left = x + "px";
      plug.style.top = y + "px";

      const isCorrect = socketIdx === CORRECT_RIGHT_FOR_LEFT[i];
      plug.classList.toggle("is-correct", isCorrect && !isDragging);
      plug.classList.toggle("is-incorrect", !isCorrect && !isDragging);
      if (isDragging) plug.classList.add("is-dragging");

      plug.addEventListener("pointerdown", (e) => onWirePointerDown(e, i));
      board.appendChild(plug);
    });

    // линии — тянутся от разъёма (не от подписи) к текущему месту штекера
    LEFT_LABELS.forEach((label, i) => {
      const isDragging = state.dragWire && state.dragWire.index === i;
      const socketIdx = state.wireAssignment[i];
      const endX = isDragging ? state.dragWire.x : pos.right[socketIdx].x;
      const endY = isDragging ? state.dragWire.y : pos.right[socketIdx].y;
      const startX = pos.left[i].x;
      const startY = pos.left[i].y;
      const midX = (startX + endX) / 2;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M${startX},${startY} C${midX},${startY} ${midX},${endY} ${endX},${endY}`);
      const correct = socketIdx === CORRECT_RIGHT_FOR_LEFT[i];
      path.setAttribute("class", "wire-line " + (isDragging ? "" : correct ? "correct" : "incorrect"));
      if (isDragging) path.setAttribute("stroke", WIRE_COLORS[i]);
      svg.appendChild(path);
    });
  }

  function onWirePointerDown(e, index) {
    if (state.wiresSolved) return;
    e.preventDefault();
    const board = $("#wires-board");
    const rect = board.getBoundingClientRect();
    state.dragWire = { index, x: e.clientX - rect.left, y: e.clientY - rect.top };
    renderWires();

    function onMove(ev) {
      const r = board.getBoundingClientRect();
      state.dragWire.x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
      state.dragWire.y = Math.max(0, Math.min(r.height, ev.clientY - r.top));
      renderWires();
    }
    function onUp(ev) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const r = board.getBoundingClientRect();
      const dropX = Math.max(0, Math.min(r.width, ev.clientX - r.left));
      const dropY = Math.max(0, Math.min(r.height, ev.clientY - r.top));
      const pos = wireSocketPositions();

      let nearest = 0;
      let bestDist = Infinity;
      pos.right.forEach((p, j) => {
        const d = Math.hypot(p.x - dropX, p.y - dropY);
        if (d < bestDist) { bestDist = d; nearest = j; }
      });

      const otherIndex = state.wireAssignment.indexOf(nearest);
      const myOldSocket = state.wireAssignment[index];
      if (otherIndex !== -1 && otherIndex !== index) {
        state.wireAssignment[otherIndex] = myOldSocket;
      }
      state.wireAssignment[index] = nearest;

      state.dragWire = null;
      renderWires();
      checkWiresSolved();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function checkWiresSolved() {
    if (correctWireCount() === LEFT_LABELS.length) {
      state.wiresSolved = true;
      $("#wires-msg").textContent = "Все три разъёма встали на место — контакт есть! Возвращайся на станцию.";
      $("#wires-msg").className = "inline-msg good";
    } else {
      state.wiresSolved = false;
      $("#wires-msg").textContent = "";
    }
    refreshScene();
  }

  function openWires() {
    if (!(state.towerVisited && state.equipmentVisited)) {
      $("#hotspot-house").classList.add("shake");
      setTimeout(() => $("#hotspot-house").classList.remove("shake"), 400);
      sayOnce("Сначала загляни на вышку и в радиооборудование — потом разберёмся с проводами.", "right");
      return;
    }
    if (!state.wiresSolved && state.wireAssignment.every((v, i) => v === CORRECT_RIGHT_FOR_LEFT[i])) {
      state.wireAssignment = shuffleWireAssignment();
    } else if (state.wireAssignment.every((v, i) => v === i) && !state.wiresSolved) {
      // на всякий случай гарантируем не собранный изначально пазл
      state.wireAssignment = shuffleWireAssignment();
    }
    $("#wires-msg").textContent = "";
    openOverlay("#overlay-wires");
    requestAnimationFrame(renderWires);
  }

  $("#wires-back").addEventListener("click", closeOverlays);

  /* ---------------------------------------------------------
     ФИНАЛЬНАЯ ЦЕПЬ — перетаскиваемые карточки, провода тянутся
     --------------------------------------------------------- */
  const circuitNodeEls = {};

  function circuitSlotPositions() {
    const board = $("#circuit-board");
    const rect = board.getBoundingClientRect();
    const n = CIRCUIT_CORRECT.length;
    const ys = CIRCUIT_CORRECT.map((_, i) => (rect.height * (i + 0.5)) / n);
    const x = rect.width / 2;
    return { rect, slots: ys.map((y) => ({ x, y })) };
  }

  function shuffleCircuitOrder() {
    let arr;
    do {
      arr = CIRCUIT_CORRECT.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } while (arr.join() === CIRCUIT_CORRECT.join());
    return arr;
  }

  function buildCircuitNodes() {
    const board = $("#circuit-board");
    $$(".circuit-node", board).forEach((n) => n.remove());
    CIRCUIT_CORRECT.forEach((id) => {
      const el = document.createElement("div");
      el.className = "circuit-node";
      el.innerHTML = CIRCUIT_LABELS[id];
      el.dataset.id = id;
      el.addEventListener("pointerdown", (e) => onCircuitPointerDown(e, id));
      board.appendChild(el);
      circuitNodeEls[id] = el;
    });
  }

  function layoutCircuitNodes() {
    const { slots } = circuitSlotPositions();
    state.circuitOrder.forEach((id, slotIndex) => {
      if (state.dragCircuit && state.dragCircuit.id === id) return; // не трогаем то, что тащат
      const el = circuitNodeEls[id];
      const w = el.offsetWidth || 200;
      const h = el.offsetHeight || 50;
      el.style.left = slots[slotIndex].x - w / 2 + "px";
      el.style.top = slots[slotIndex].y - h / 2 + "px";
    });
    drawCircuitWires();
  }

  function drawCircuitWires() {
    const svg = $("#circuit-wires");
    svg.innerHTML = "";
    const { slots } = circuitSlotPositions();

    function centerOf(id, slotIndex) {
      if (state.dragCircuit && state.dragCircuit.id === id) {
        return { x: state.dragCircuit.x, y: state.dragCircuit.y };
      }
      return slots[slotIndex];
    }

    for (let i = 0; i < state.circuitOrder.length - 1; i++) {
      const idA = state.circuitOrder[i];
      const idB = state.circuitOrder[i + 1];
      const a = centerOf(idA, i);
      const b = centerOf(idB, i + 1);
      const correct = CIRCUIT_CORRECT.indexOf(idA) + 1 === CIRCUIT_CORRECT.indexOf(idB);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "circuit-wire " + (correct ? "correct" : "incorrect"));
      svg.appendChild(line);
    }
  }

  function onCircuitPointerDown(e, id) {
    if (state.circuitSolved) return;
    e.preventDefault();
    const el = circuitNodeEls[id];
    el.classList.add("is-dragging");
    const board = $("#circuit-board");
    const rect = board.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offsetX = e.clientX - elRect.left;
    const offsetY = e.clientY - elRect.top;

    state.dragCircuit = {
      id,
      x: elRect.left - rect.left + elRect.width / 2,
      y: elRect.top - rect.top + elRect.height / 2
    };

    function place(clientX, clientY) {
      const r = board.getBoundingClientRect();
      let left = clientX - r.left - offsetX;
      let top = clientY - r.top - offsetY;
      left = Math.max(0, Math.min(r.width - elRect.width, left));
      top = Math.max(0, Math.min(r.height - elRect.height, top));
      el.style.left = left + "px";
      el.style.top = top + "px";
      state.dragCircuit.x = left + elRect.width / 2;
      state.dragCircuit.y = top + elRect.height / 2;
      drawCircuitWires();
    }

    place(e.clientX, e.clientY);

    function onMove(ev) { place(ev.clientX, ev.clientY); }
    function onUp(ev) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.classList.remove("is-dragging");

      const { slots } = circuitSlotPositions();
      const r = board.getBoundingClientRect();
      const dropX = Math.max(0, Math.min(r.width, ev.clientX - r.left));
      const dropY = Math.max(0, Math.min(r.height, ev.clientY - r.top));

      let nearest = 0, bestDist = Infinity;
      slots.forEach((s, i) => {
        const d = Math.hypot(s.x - dropX, s.y - dropY);
        if (d < bestDist) { bestDist = d; nearest = i; }
      });

      const fromIndex = state.circuitOrder.indexOf(id);
      if (nearest !== fromIndex) {
        const tmp = state.circuitOrder[nearest];
        state.circuitOrder[nearest] = id;
        state.circuitOrder[fromIndex] = tmp;
      }
      state.dragCircuit = null;
      layoutCircuitNodes();
      checkCircuitSolved();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function checkCircuitSolved() {
    const solved = state.circuitOrder.join() === CIRCUIT_CORRECT.join();
    if (solved) {
      state.circuitSolved = true;
      $("#circuit-board").classList.add("is-solved");
      $("#circuit-msg").textContent = "Связь восстановлена! Линия сигнала выстроена верно.";
      $("#circuit-msg").className = "inline-msg good";
      drawCircuitWires();
      refreshScene();

      setTimeout(() => {
        $("#bonus-value").textContent = BONUSES[Math.floor(Math.random() * BONUSES.length)];
        showScreen("screen-victory");
      }, 1600);
    }
  }

  function openCircuitPuzzle() {
    state.circuitOrder = shuffleCircuitOrder();
    state.circuitSolved = false;
    $("#circuit-board").classList.remove("is-solved");
    $("#circuit-msg").textContent = "";
    openOverlay("#overlay-circuit");
    buildCircuitNodes();
    requestAnimationFrame(layoutCircuitNodes);

    sayOnce("Вот мы и добрались до последнего этапа — собери линию сигнала, и связь вернётся!", "right");
  }

  /* ---------------------------------------------------------
     НАВИГАЦИЯ И СТАРТ
     --------------------------------------------------------- */
  $("#btn-start").addEventListener("click", () => {
    showScreen("screen-main");
    refreshScene();
    startIntroSequence();
  });

  function startIntroSequence() {
    if (state.introDone) return;
    playSequence(
      [
        { text: "Привет! Похоже, на станции Т2 что-то пошло не так - сеть рабоатет нестабильно.", position: "right" },
        { text: "Смотри: вышка, дом со щитком и значок радиооборудования над ним. Что-то из этого барахлит.", position: "right" },
        { text: "Начни с вышки или с радиооборудования, я буду рядом, если понадобится помощь.", position: "right" }
      ],
      () => { state.introDone = true; }
    );
  }

  $("#hotspot-tower").addEventListener("click", () => { if (!sequence) openTower(); });
  $("#hotspot-lightning").addEventListener("click", () => { if (!sequence) openEquipment(); });
  $("#hotspot-house").addEventListener("click", () => { if (!sequence) openWires(); });
  $("#btn-final-stage").addEventListener("click", () => { if (!sequence) openCircuitPuzzle(); });

  $("#btn-replay").addEventListener("click", () => {
    state.introDone = false;
    state.towerVisited = false;
    state.equipmentVisited = false;
    state.equipmentIntroShown = false;
    state.powerIndex = 1;
    state.moduleOn = false;
    state.wireAssignment = [0, 1, 2];
    state.wiresSolved = false;
    state.circuitOrder = CIRCUIT_CORRECT.slice();
    state.circuitSolved = false;
    setMascotVisible(false);
    refreshScene();
    showScreen("screen-title");
  });

  window.addEventListener("resize", () => {
    if ($("#overlay-wires").classList.contains("is-active")) renderWires();
    if ($("#overlay-circuit").classList.contains("is-active")) layoutCircuitNodes();
  });

  /* ---------------------------------------------------------
     ИНИЦИАЛИЗАЦИЯ
     --------------------------------------------------------- */
  refreshScene();
})();
