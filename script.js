const cloudLayer = document.querySelector(".cloud-layer");
const maxClouds = 24;
const screens = Array.from(document.querySelectorAll(".edition-screen"));
const viewport = document.querySelector(".edition-viewport");
const editionIds = ["edition-1", "edition-2", "edition-3", "edition-4", "edition-5"];
const validEdition = (id) => editionIds.includes(id);
let activeCard = null;
let pinnedCard = null;

function showFact(card) {
  if (activeCard && activeCard !== card) {
    activeCard.classList.remove("is-selected");
    activeCard.setAttribute("aria-expanded", "false");
    activeCard.removeAttribute("aria-describedby");
    activeCard.querySelector(".cloud-fact-text").setAttribute("aria-hidden", "true");
  }

  activeCard = card;
  card.querySelector(".cloud-fact-text").setAttribute("aria-hidden", "false");
  card.classList.add("is-selected");
  card.setAttribute("aria-expanded", "true");
  card.setAttribute("aria-describedby", `cloud-fact-${card.dataset.number}`);
}

function hideFact() {
  if (activeCard) {
    activeCard.classList.remove("is-selected");
    activeCard.setAttribute("aria-expanded", "false");
    activeCard.removeAttribute("aria-describedby");
    activeCard.querySelector(".cloud-fact-text").setAttribute("aria-hidden", "true");
    activeCard = null;
  }
}

function showEdition(id) {
  if (!validEdition(id)) return;
  if (id !== "edition-2" && activeCard) {
    pinnedCard = null;
    hideFact();
  }

  const number = id.slice(-1);
  document.body.dataset.edition = number;
  document.title = `Cloudspotter — editie 0${number}`;
  viewport.scrollLeft = 0;
  screens.forEach((screen) => {
    const active = screen.id === `screen-${number}`;
    screen.inert = !active;
    screen.setAttribute("aria-hidden", String(!active));
    if (active) screen.scrollTop = 0;
  });
}

function navigateToEdition(id) {
  if (!validEdition(id)) return;
  if (location.hash !== `#${id}`) history.pushState({ edition: id }, "", `#${id}`);
  showEdition(id);
}

document.querySelectorAll('.topbar a[href^="#edition-"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToEdition(link.hash.slice(1));
  });
});

function syncEditionFromHash() {
  const id = location.hash.slice(1);
  showEdition(validEdition(id) ? id : "edition-1");
}

window.addEventListener("hashchange", syncEditionFromHash);
window.addEventListener("popstate", syncEditionFromHash);
syncEditionFromHash();

let swipeStart;

viewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" && !event.target.closest(".drawing-cloud, .wind-observation")) {
    swipeStart = { x: event.clientX, y: event.clientY };
  }
});

viewport.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;

  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = undefined;

  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

  const current = Number(document.body.dataset.edition);
  const next = Math.max(1, Math.min(5, current + (dx < 0 ? 1 : -1)));
  if (next !== current) navigateToEdition(`edition-${next}`);
});

viewport.addEventListener("pointercancel", () => {
  swipeStart = undefined;
});

document.querySelectorAll(".photo-card").forEach((card) => {
  const fact = document.createElement("span");
  fact.className = "cloud-fact-text";
  fact.id = `cloud-fact-${card.dataset.number}`;
  fact.textContent = card.dataset.fact;
  fact.setAttribute("aria-hidden", "true");
  fact.setAttribute("aria-live", "polite");
  card.append(fact);

  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch" && !pinnedCard) showFact(card);
  });
  card.addEventListener("pointerleave", () => {
    if (!pinnedCard && document.activeElement !== card) hideFact();
  });
  card.addEventListener("focus", () => {
    if (!pinnedCard) showFact(card);
  });
  card.addEventListener("blur", () => {
    if (!pinnedCard) hideFact();
  });
  card.addEventListener("click", () => {
    if (pinnedCard === card) {
      pinnedCard = null;
      hideFact();
      return;
    }

    pinnedCard = card;
    showFact(card);
  });
});

document.querySelectorAll(".letter").forEach((letter) => {
  let resetTimer;
  let lastHoverPoint;

  const blowLetter = (event) => {
    if (event.type === "pointerenter") {
      if (lastHoverPoint && Math.hypot(event.clientX - lastHoverPoint.x, event.clientY - lastHoverPoint.y) < 12) return;
      lastHoverPoint = { x: event.clientX, y: event.clientY };
    }

    const bounds = letter.getBoundingClientRect();
    const dx = bounds.left + bounds.width / 2 - event.clientX;
    const dy = bounds.top + bounds.height / 2 - event.clientY;
    const distance = Math.hypot(dx, dy) || 1;
    const gust = 22 + Math.random() * 22;

    letter.style.setProperty("--wind-x", `${(dx / distance * gust + 8).toFixed(1)}px`);
    letter.style.setProperty("--wind-y", `${(dy / distance * gust - 4).toFixed(1)}px`);
    letter.style.setProperty("--wind-turn", `${(Math.random() * 8 - 4).toFixed(1)}deg`);
    letter.classList.add("blown");

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      letter.classList.remove("blown");
      letter.style.removeProperty("--wind-x");
      letter.style.removeProperty("--wind-y");
      letter.style.removeProperty("--wind-turn");
    }, 1300);
  };

  letter.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") blowLetter(event);
  });
  letter.addEventListener("pointerdown", blowLetter);
});

document.addEventListener("click", (event) => {
  if (activeCard && !event.target.closest(".photo-card")) {
    pinnedCard = null;
    hideFact();
  }

  if (document.body.dataset.edition !== "1" || event.target.closest("a, button")) return;

  if (cloudLayer.children.length >= maxClouds) {
    cloudLayer.firstElementChild.remove();
  }

  const cloud = document.createElement("span");
  cloud.className = "floating-cloud";
  cloud.textContent = "\u2601\uFE0E";
  cloud.style.left = `${event.clientX}px`;
  cloud.style.top = `${event.clientY}px`;
  cloud.style.fontSize = `${24 + Math.random() * 24}px`;
  cloud.style.setProperty("--drift", `${Math.round(Math.random() * 80 - 40)}px`);
  cloud.addEventListener("animationend", () => cloud.remove(), { once: true });
  cloudLayer.append(cloud);
});

const phoneQr = document.querySelector("#phone-qr");
const qrFallback = document.querySelector("#qr-fallback");

if (location.protocol === "https:" && phoneQr && qrFallback) {
  const phoneUrl = new URL(location.href);
  phoneUrl.searchParams.set("mode", "draw");
  phoneUrl.hash = "edition-3";
  phoneQr.addEventListener("load", () => {
    phoneQr.hidden = false;
    qrFallback.hidden = true;
  }, { once: true });
  phoneQr.addEventListener("error", () => {
    qrFallback.textContent = "De QR-code is niet geladen. Open de website op je gsm.";
  }, { once: true });
  phoneQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(phoneUrl.href)}`;
}

const drawingCanvas = document.querySelector("#cloud-drawing");

if (drawingCanvas) {
  const drawingContext = drawingCanvas.getContext("2d");

  if (drawingContext) {
    const strokes = [];
    let activeStroke = null;
    let drawColor = "#fffdf3";

    function renderDrawing() {
      const bounds = drawingCanvas.getBoundingClientRect();
      drawingContext.clearRect(0, 0, bounds.width, bounds.height);

      strokes.forEach((stroke) => {
        drawingContext.beginPath();
        drawingContext.strokeStyle = stroke.color;
        drawingContext.fillStyle = stroke.color;
        drawingContext.lineWidth = Math.max(3, bounds.width * 0.012);
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";

        if (stroke.points.length === 1) {
          const point = stroke.points[0];
          drawingContext.arc(point.x * bounds.width, point.y * bounds.height, drawingContext.lineWidth / 2, 0, Math.PI * 2);
          drawingContext.fill();
          return;
        }

        stroke.points.forEach((point, index) => {
          const x = point.x * bounds.width;
          const y = point.y * bounds.height;
          if (index === 0) drawingContext.moveTo(x, y);
          else drawingContext.lineTo(x, y);
        });
        drawingContext.stroke();
      });
    }

    function resizeDrawingCanvas() {
      const bounds = drawingCanvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(bounds.width * ratio);
      const height = Math.round(bounds.height * ratio);
      if (drawingCanvas.width === width && drawingCanvas.height === height) return;

      drawingCanvas.width = width;
      drawingCanvas.height = height;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderDrawing();
    }

    function getDrawingPoint(event) {
      const bounds = drawingCanvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
      };
    }

    drawingCanvas.addEventListener("pointerdown", (event) => {
      if (!drawingCanvas.getBoundingClientRect().width) return;
      event.preventDefault();
      drawingCanvas.setPointerCapture(event.pointerId);
      activeStroke = { color: drawColor, points: [getDrawingPoint(event)] };
      strokes.push(activeStroke);
      renderDrawing();
    });

    drawingCanvas.addEventListener("pointermove", (event) => {
      if (!activeStroke) return;
      activeStroke.points.push(getDrawingPoint(event));
      renderDrawing();
    });

    const finishStroke = () => {
      activeStroke = null;
    };

    drawingCanvas.addEventListener("pointerup", finishStroke);
    drawingCanvas.addEventListener("pointercancel", finishStroke);
    window.addEventListener("resize", resizeDrawingCanvas);
    resizeDrawingCanvas();

    document.querySelectorAll(".draw-color").forEach((button) => {
      button.addEventListener("click", () => {
        drawColor = button.dataset.color;
        document.querySelectorAll(".draw-color").forEach((colorButton) => {
          const active = colorButton === button;
          colorButton.classList.toggle("is-active", active);
          colorButton.setAttribute("aria-pressed", String(active));
        });
      });
    });

    document.querySelector("#clear-drawing").addEventListener("click", () => {
      strokes.length = 0;
      renderDrawing();
    });
  }
}

const observationList = document.querySelector("#wind-observations");

if (observationList) {
  const observations = Array.from(observationList.querySelectorAll(".wind-observation"));
  const sortButtons = Array.from(document.querySelectorAll(".edition-four-sort [data-sort]"));

  function revealObservation(observation) {
    observation.classList.add("is-revealed");
    observation.setAttribute("aria-expanded", "true");
    observation.querySelector(".wind-observation-detail").setAttribute("aria-hidden", "false");
  }

  observations.forEach((observation) => {
    let pointerStart = null;

    observation.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerStart = { x: event.clientX, y: event.clientY };
      observation.setPointerCapture(event.pointerId);
    });

    observation.addEventListener("pointerup", (event) => {
      if (!pointerStart) return;

      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      pointerStart = null;

      if (Math.abs(deltaX) >= 36 && Math.abs(deltaX) > Math.abs(deltaY)) {
        revealObservation(observation);
      }
    });

    observation.addEventListener("pointercancel", () => {
      pointerStart = null;
    });

    observation.addEventListener("click", () => revealObservation(observation));
  });

  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const sortKey = button.dataset.sort;
      const sorted = [...observations].sort((first, second) =>
        first.dataset[sortKey].localeCompare(second.dataset[sortKey], "nl", {
          numeric: true,
          sensitivity: "base"
        })
      );

      sorted.forEach((observation) => observationList.append(observation.closest("li")));
      sortButtons.forEach((sortButton) => {
        sortButton.setAttribute("aria-pressed", String(sortButton === button));
      });
    });
  });
}
