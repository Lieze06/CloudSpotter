const cloudLayer = document.querySelector(".cloud-layer");
const maxClouds = 24;
const screens = Array.from(document.querySelectorAll(".edition-screen"));
const viewport = document.querySelector(".edition-viewport");
const editionIds = ["edition-home", "edition-1", "edition-2", "edition-3", "edition-4", "edition-5", "edition-6"];
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
  const number = id === "edition-home" ? "home" : id.slice(-1);
  if (id !== "edition-2" && activeCard) {
    pinnedCard = null;
    hideFact();
  }

  if (id === "edition-home") {
    document.body.dataset.edition = "home";
    document.title = "Cloudspotter";
  } else {
    document.body.dataset.edition = number;
    document.title = `Cloudspotter — editie 0${number}`;
  }
  viewport.scrollLeft = 0;
  screens.forEach((screen) => {
    const active = id === "edition-home"
      ? screen.id === "screen-home"
      : screen.id === `screen-${number}`;
    screen.inert = !active;
    screen.setAttribute("aria-hidden", String(!active));
    if (active) screen.scrollTop = 0;
  });
  if (id === "edition-5") {
    requestAnimationFrame(() => {
      document.querySelector("#screen-5")?.dispatchEvent(new Event("scroll"));
    });
  }
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

const homeWordmark = document.querySelector(".wordmark-small");

if (homeWordmark) {
  homeWordmark.addEventListener("click", (event) => {
    event.preventDefault();
    navigateToEdition("edition-home");
  });
}

function syncEditionFromHash() {
  const id = location.hash.slice(1);
  showEdition(validEdition(id) ? id : "edition-home");
}

window.addEventListener("hashchange", syncEditionFromHash);
window.addEventListener("popstate", syncEditionFromHash);
syncEditionFromHash();

const dayEdition = document.querySelector("#screen-5");
const dayTime = document.querySelector("#day-time");
const dayWeatherImage = document.querySelector("#day-weather-image");

if (dayEdition && dayTime) {
  function updateDayTime() {
    const maxScroll = Math.max(1, dayEdition.scrollHeight - dayEdition.clientHeight);
    const progress = Math.max(0, Math.min(1, dayEdition.scrollTop / maxScroll));
    const totalMinutes = Math.min(1439, Math.floor(progress * 24 * 60));
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const timeText = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    dayTime.textContent = timeText;
    dayTime.dateTime = timeText;

    const decimalHour = hour + minute / 60;
    const skyStops = [
      { hour: 0, color: [16, 28, 58] },
      { hour: 5, color: [38, 56, 92] },
      { hour: 7, color: [111, 146, 180] },
      { hour: 12, color: [135, 185, 216] },
      { hour: 17, color: [196, 142, 128] },
      { hour: 20, color: [72, 116, 159] },
      { hour: 24, color: [16, 28, 58] }
    ];

    let leftStop = skyStops[0];
    let rightStop = skyStops[skyStops.length - 1];
    for (let index = 0; index < skyStops.length - 1; index += 1) {
      if (decimalHour >= skyStops[index].hour && decimalHour <= skyStops[index + 1].hour) {
        leftStop = skyStops[index];
        rightStop = skyStops[index + 1];
        break;
      }
    }

    const blend = (decimalHour - leftStop.hour) / Math.max(1, rightStop.hour - leftStop.hour);
    const skyColor = leftStop.color.map((channel, index) =>
      Math.round(channel + (rightStop.color[index] - channel) * blend)
    );
    dayEdition.style.setProperty("--sky-r", String(skyColor[0]));
    dayEdition.style.setProperty("--sky-g", String(skyColor[1]));
    dayEdition.style.setProperty("--sky-b", String(skyColor[2]));

    const phase = decimalHour < 5 || decimalHour >= 21
      ? "night"
      : decimalHour < 9
        ? "morning"
        : decimalHour < 17
          ? "day"
          : "evening";
    dayEdition.dataset.phase = phase;

    const viewportHour = progress * 24;
    const moments = Array.from(dayEdition.querySelectorAll(".day-moment"));
    let nearestMoment = null;
    let nearestDistance = Infinity;

    moments.forEach((moment) => {
      const momentHour = Number.parseFloat(moment.style.getPropertyValue("--uur"));
      const distance = Math.abs(momentHour - viewportHour);
      if (distance < nearestDistance) {
        nearestMoment = moment;
        nearestDistance = distance;
      }
      moment.classList.toggle("is-active", false);
    });

    if (nearestMoment && nearestDistance < 2.25) {
      nearestMoment.classList.add("is-active");
      const nearestImage = nearestMoment.querySelector(".moment-cloud");
      if (dayWeatherImage && nearestImage && dayWeatherImage.src !== nearestImage.src) {
        dayWeatherImage.style.opacity = "0";
        window.setTimeout(() => {
          dayWeatherImage.src = nearestImage.src;
          dayWeatherImage.alt = nearestImage.alt;
          dayWeatherImage.style.opacity = "0.5";
        }, 280);
      }
    }
  }

  dayEdition.addEventListener("scroll", updateDayTime, { passive: true });
  window.addEventListener("resize", updateDayTime);

  function keepDayTimeUpdated() {
    if (document.body.dataset.edition === "5") updateDayTime();
    requestAnimationFrame(keepDayTimeUpdated);
  }

  keepDayTimeUpdated();
  updateDayTime();
}

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

const windCanvas = document.querySelector("#cloud-wind-canvas");

if (windCanvas) {
  const windContext = windCanvas.getContext("2d");
  const celebration = document.querySelector("#cloud-celebration");
  const celebrationCanvas = document.querySelector("#confetti-canvas");
  const celebrationContext = celebrationCanvas.getContext("2d");
  const resetButton = document.querySelector("#reset-clouds");
  const cloudParticles = [];
  const confetti = [];
  let pointer = { x: 0, y: 0, px: 0, py: 0, active: false };
  let windAudio = null;
  let celebrationFrame = null;
  let completed = false;

  function resizeCloudCanvas() {
    const bounds = windCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    windCanvas.width = Math.round(bounds.width * ratio);
    windCanvas.height = Math.round(bounds.height * ratio);
    windContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    createClouds();
  }

  function createClouds() {
    cloudParticles.length = 0;
    const bounds = windCanvas.getBoundingClientRect();
    const cols = Math.ceil(bounds.width / 58);
    const rows = Math.ceil(bounds.height / 58);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (Math.random() < 0.04) continue;
        const x = col * 58 + 12 + Math.random() * 38;
        const y = row * 58 + 8 + Math.random() * 34;
        const count = 6 + Math.floor(Math.random() * 5);
        for (let part = 0; part < count; part += 1) {
          cloudParticles.push({
            x: x + (part - count / 2) * (12 + Math.random() * 8),
            y: y + (Math.random() - 0.5) * 25,
            radius: 18 + Math.random() * 24,
            vx: 0,
            vy: 0,
            alpha: 0.82 + Math.random() * 0.18,
            gone: false
          });
        }
      }
    }
  }

  function drawClouds() {
    const bounds = windCanvas.getBoundingClientRect();
    windContext.clearRect(0, 0, bounds.width, bounds.height);
    windContext.save();
    windContext.fillStyle = "#fff";
    cloudParticles.forEach((particle) => {
      if (particle.gone) {
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        particle.alpha *= 0.97;
        particle.x += particle.vx;
        particle.y += particle.vy;
      }
      if (particle.alpha < 0.01) return;
      windContext.globalAlpha = particle.alpha;
      windContext.beginPath();
      windContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      windContext.fill();
    });
    windContext.restore();
  }

  function ensureWindAudio() {
    if (!windAudio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const buffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 550;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      windAudio = { context, gain };
    }
    if (windAudio.context.state === "suspended") windAudio.context.resume();
  }

  function gust(event) {
    if (completed) return;
    ensureWindAudio();
    const bounds = windCanvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const dx = x - pointer.px || 1;
    const dy = y - pointer.py;
    pointer = { x, y, px: x, py: y, active: true };

    let changed = 0;
    cloudParticles.forEach((particle) => {
      if (particle.gone) return;
      const distance = Math.hypot(particle.x - x, particle.y - y);
      if (distance < 66) {
        particle.gone = true;
        particle.vx = Math.sign(dx) * (3 + Math.random() * 5) + (particle.x - x) * 0.025;
        particle.vy = dy * 0.04 + (particle.y - y) * 0.035 - 1;
        changed += 1;
      }
    });

    if (changed && windAudio) {
      windAudio.gain.gain.cancelScheduledValues(windAudio.context.currentTime);
      windAudio.gain.gain.setTargetAtTime(0.035, windAudio.context.currentTime, 0.03);
      clearTimeout(gust.windTimer);
      gust.windTimer = setTimeout(() => {
        if (windAudio) windAudio.gain.gain.setTargetAtTime(0, windAudio.context.currentTime, 0.08);
      }, 130);
    }

    const remaining = cloudParticles.filter((particle) => !particle.gone).length;
    if (remaining < cloudParticles.length * 0.025) celebrate();
  }

  function createConfetti() {
    const bounds = celebrationCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    celebrationCanvas.width = Math.round(bounds.width * ratio);
    celebrationCanvas.height = Math.round(bounds.height * ratio);
    celebrationContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    confetti.length = 0;
    for (let index = 0; index < 180; index += 1) {
      confetti.push({
        x: bounds.width * (0.1 + Math.random() * 0.8),
        y: -20 - Math.random() * bounds.height * 0.7,
        w: 6 + Math.random() * 8,
        h: 3 + Math.random() * 5,
        vx: -3 + Math.random() * 6,
        vy: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        spin: -0.18 + Math.random() * 0.36,
        color: ["#ffe263", "#ff796c", "#fffdf3", "#20366f", "#70c9a5"][index % 5]
      });
    }
  }

  function animateConfetti() {
    const bounds = celebrationCanvas.getBoundingClientRect();
    celebrationContext.clearRect(0, 0, bounds.width, bounds.height);
    confetti.forEach((piece) => {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.025;
      piece.rotation += piece.spin;
      celebrationContext.save();
      celebrationContext.translate(piece.x, piece.y);
      celebrationContext.rotate(piece.rotation);
      celebrationContext.fillStyle = piece.color;
      celebrationContext.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      celebrationContext.restore();
    });
    if (confetti.some((piece) => piece.y < bounds.height + 30)) {
      celebrationFrame = requestAnimationFrame(animateConfetti);
    }
  }

  function celebrate() {
    if (completed) return;
    completed = true;
    celebration.classList.add("is-visible");
    celebration.setAttribute("aria-hidden", "false");
    resetButton.hidden = false;
    createConfetti();
    animateConfetti();
  }

  function resetClouds() {
    if (celebrationFrame) cancelAnimationFrame(celebrationFrame);
    completed = false;
    celebration.classList.remove("is-visible");
    celebration.setAttribute("aria-hidden", "true");
    resetButton.hidden = true;
    createClouds();
  }

  windCanvas.addEventListener("pointermove", gust);
  windCanvas.addEventListener("pointerdown", (event) => {
    pointer.active = true;
    pointer.px = event.clientX - windCanvas.getBoundingClientRect().left;
    pointer.py = event.clientY - windCanvas.getBoundingClientRect().top;
    gust(event);
  });
  windCanvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  resetButton.addEventListener("click", resetClouds);
  window.addEventListener("resize", resizeCloudCanvas);
  resizeCloudCanvas();

  function animateClouds() {
    drawClouds();
    requestAnimationFrame(animateClouds);
  }
  animateClouds();
}
