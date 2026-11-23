(() => {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const slides = Array.from(document.querySelectorAll(".slide"));
  const story = document.getElementById("main-story");
  const prevButton = document.getElementById("prev-button");
  const nextButton = document.getElementById("next-button");
  const currentNumber = document.getElementById("current-number");
  const currentChapter = document.getElementById("current-chapter");
  const progressBar = document.getElementById("progress-bar");
  const dockDots = Array.from(document.querySelectorAll(".dock-dot"));
  const chapterLinks = Array.from(document.querySelectorAll(".chapter-link"));
  const panelDots = Array.from(document.querySelectorAll(".panel-dots i"));
  const announcer = document.getElementById("slide-announcer");
  const chaptersToggle = document.getElementById("chapters-toggle");
  const chapterMenu = document.getElementById("chapter-menu");
  const chapterPanel = chapterMenu.querySelector(".chapter-panel");
  const closeMenuButton = document.getElementById("close-menu");
  const toast = document.getElementById("toast");
  const swipeHint = document.querySelector(".swipe-hint");
  const cursorAura = document.getElementById("cursor-aura");
  const shareButton = document.getElementById("share-journey");
  const restartButton = document.getElementById("restart-journey");

  const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)");

  let currentIndex = 0;
  let menuOpen = false;
  let lastFocusedElement = null;
  let toastTimer = 0;
  let hintDismissed = false;

  const toArabicNumber = (value, pad = true) => {
    const stringValue = pad ? String(value).padStart(2, "0") : String(value);
    return stringValue.replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)]);
  };

  const hexToRgb = (hex) => {
    const normalized = hex.replace("#", "").trim();
    const safeHex = normalized.length === 3
      ? normalized.split("").map((character) => character + character).join("")
      : normalized;
    const parsed = Number.parseInt(safeHex, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255
    };
  };

  const getIndexFromHash = () => {
    const match = window.location.hash.match(/slide-(\d+)/i);
    if (!match) return 0;
    return Math.min(Math.max(Number(match[1]) - 1, 0), slides.length - 1);
  };

  const setAccent = (color) => {
    const { r, g, b } = hexToRgb(color);
    doc.style.setProperty("--accent", color);
    doc.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  };

  const dismissSwipeHint = () => {
    if (hintDismissed || !swipeHint) return;
    hintDismissed = true;
    swipeHint.classList.add("is-hidden");
  };

  const showToast = (message) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3200);
  };

  const updateInterface = (index) => {
    const slide = slides[index];
    const chapter = slide.dataset.chapter || "";
    const accent = slide.dataset.accent || "#67ebda";
    const isFirst = index === 0;
    const isLast = index === slides.length - 1;

    setAccent(accent);

    currentNumber.textContent = toArabicNumber(index + 1);
    currentNumber.classList.remove("is-changing");
    // Restart the small counter animation without changing layout.
    void currentNumber.offsetWidth;
    currentNumber.classList.add("is-changing");

    currentChapter.textContent = chapter;
    progressBar.style.width = `${((index + 1) / slides.length) * 100}%`;

    prevButton.disabled = isFirst;
    nextButton.disabled = isLast;

    dockDots.forEach((dot, dotIndex) => {
      const active = dotIndex === index;
      dot.classList.toggle("is-active", active);
      if (active) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    chapterLinks.forEach((link, linkIndex) => {
      const active = linkIndex === index;
      link.classList.toggle("is-current", active);
      if (active) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    panelDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });

    body.classList.toggle("is-final", isLast);
    document.title = `أسرار أعماق البحار — ${chapter}`;
    announcer.textContent = `الفصل ${toArabicNumber(index + 1, false)}: ${chapter}. الشريحة ${toArabicNumber(index + 1)} من ${toArabicNumber(slides.length)}.`;

    window.requestAnimationFrame(() => {
      currentNumber.classList.remove("is-changing");
    });
  };

  const activateSlide = (index, options = {}) => {
    const { direction, updateHash = true, announce = true } = options;
    const targetIndex = Math.min(Math.max(index, 0), slides.length - 1);
    if (targetIndex === currentIndex && slides[targetIndex].classList.contains("is-active")) {
      updateInterface(targetIndex);
      if (updateHash) {
        window.history.replaceState(null, "", `#slide-${targetIndex + 1}`);
      }
      return;
    }

    const inferredDirection = targetIndex > currentIndex ? "next" : "prev";
    story.dataset.direction = direction || inferredDirection;

    slides.forEach((slide, slideIndex) => {
      const isTarget = slideIndex === targetIndex;
      slide.classList.toggle("is-active", isTarget);
      slide.setAttribute("aria-hidden", String(!isTarget));
      if (isTarget) {
        slide.removeAttribute("inert");
        slide.querySelector(".slide-bg").style.setProperty("--parallax-x", "0px");
        slide.querySelector(".slide-bg").style.setProperty("--parallax-y", "0px");
      } else {
        slide.setAttribute("inert", "");
      }
    });

    currentIndex = targetIndex;
    updateInterface(targetIndex);

    if (updateHash) {
      window.history.replaceState(null, "", `#slide-${targetIndex + 1}`);
    }

    if (announce) {
      dismissSwipeHint();
    }
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      activateSlide(currentIndex + 1, { direction: "next" });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      activateSlide(currentIndex - 1, { direction: "prev" });
    }
  };

  const openMenu = () => {
    if (menuOpen) return;
    menuOpen = true;
    lastFocusedElement = document.activeElement;
    chapterMenu.classList.add("is-open");
    chapterMenu.setAttribute("aria-hidden", "false");
    chapterPanel.removeAttribute("inert");
    chaptersToggle.setAttribute("aria-expanded", "true");
    chaptersToggle.setAttribute("aria-label", "إغلاق فهرس الرحلة");
    body.classList.add("menu-open");
    window.setTimeout(() => closeMenuButton.focus({ preventScroll: true }), 80);
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!menuOpen) return;
    menuOpen = false;
    chapterMenu.classList.remove("is-open");
    chapterMenu.setAttribute("aria-hidden", "true");
    chapterPanel.setAttribute("inert", "");
    chaptersToggle.setAttribute("aria-expanded", "false");
    chaptersToggle.setAttribute("aria-label", "فتح فهرس الرحلة");
    body.classList.remove("menu-open");
    if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus({ preventScroll: true });
    }
  };

  const trapMenuFocus = (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      chapterPanel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.getClientRects().length > 0);

    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    helper.style.pointerEvents = "none";
    document.body.appendChild(helper);
    helper.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    helper.remove();
    return copied;
  };

  const shareJourney = async () => {
    const url = new URL(window.location.href);
    url.hash = `slide-${currentIndex + 1}`;
    const shareData = {
      title: "أسرار أعماق البحار",
      text: "ثمانية فصول... وغوصة واحدة من الفكرة إلى الإطلاق.",
      url: url.toString()
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }

    try {
      const copied = await copyToClipboard(url.toString());
      showToast(copied ? "تم نسخ رابط الرحلة. شاركه مع من تحب." : "تعذّر النسخ، يمكنك نسخ الرابط من شريط المتصفح.");
    } catch {
      showToast("تعذّر النسخ، يمكنك نسخ الرابط من شريط المتصفح.");
    }
  };

  // -------------------------------------------------------
  // Navigation events
  // -------------------------------------------------------

  prevButton.addEventListener("click", goToPrevious);
  nextButton.addEventListener("click", goToNext);

  document.querySelectorAll("[data-go]").forEach((control) => {
    control.addEventListener("click", () => {
      const targetIndex = Number(control.dataset.go);
      if (Number.isNaN(targetIndex)) return;
      if (menuOpen) closeMenu({ restoreFocus: false });
      activateSlide(targetIndex, {
        direction: targetIndex >= currentIndex ? "next" : "prev"
      });
    });
  });

  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    if (menuOpen) closeMenu({ restoreFocus: false });
    activateSlide(0, { direction: "prev" });
  });

  restartButton.addEventListener("click", () => {
    activateSlide(0, { direction: "prev" });
    showToast("عدنا إلى البداية. رحلة جديدة تنتظرك.");
  });

  shareButton.addEventListener("click", shareJourney);

  chaptersToggle.addEventListener("click", () => {
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  closeMenuButton.addEventListener("click", () => closeMenu());
  chapterMenu.querySelector("[data-close-menu]").addEventListener("click", () => closeMenu());

  document.addEventListener("keydown", (event) => {
    if (menuOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      trapMenuFocus(event);
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const interactive = event.target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [role="button"]'
    );

    switch (event.key) {
      case "ArrowLeft":
      case "PageDown":
        event.preventDefault();
        goToNext();
        break;
      case "ArrowRight":
      case "PageUp":
        event.preventDefault();
        goToPrevious();
        break;
      case " ":
        if (interactive) return;
        event.preventDefault();
        goToNext();
        break;
      case "Home":
        event.preventDefault();
        activateSlide(0, { direction: "prev" });
        break;
      case "End":
        event.preventDefault();
        activateSlide(slides.length - 1, { direction: "next" });
        break;
      default:
        break;
    }
  });

  window.addEventListener("hashchange", () => {
    const hashIndex = getIndexFromHash();
    if (hashIndex !== currentIndex) {
      activateSlide(hashIndex, {
        direction: hashIndex >= currentIndex ? "next" : "prev",
        updateHash: false
      });
    }
  });

  // -------------------------------------------------------
  // Touch navigation
  // -------------------------------------------------------

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  story.addEventListener(
    "touchstart",
    (event) => {
      if (menuOpen || event.touches.length !== 1) return;
      if (event.target.closest("button, a")) return;
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );

  story.addEventListener(
    "touchend",
    (event) => {
      if (menuOpen || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      const horizontalIntent =
        Math.abs(deltaX) > 48 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.25 &&
        elapsed < 900;

      if (!horizontalIntent) return;

      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    },
    { passive: true }
  );

  // -------------------------------------------------------
  // Pointer ambience
  // -------------------------------------------------------

  let pointerTicking = false;
  let pointerX = 0;
  let pointerY = 0;

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pointerTicking) return;
      pointerTicking = true;

      window.requestAnimationFrame(() => {
        if (cursorAura) {
          cursorAura.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        }

        if (FINE_POINTER.matches && !REDUCED_MOTION.matches) {
          const activeSlide = slides[currentIndex];
          const background = activeSlide.querySelector(".slide-bg");
          const normalizedX = (pointerX / window.innerWidth - 0.5) * 2;
          const normalizedY = (pointerY / window.innerHeight - 0.5) * 2;
          background.style.setProperty("--parallax-x", `${normalizedX * -7}px`);
          background.style.setProperty("--parallax-y", `${normalizedY * -5}px`);
        }

        pointerTicking = false;
      });
    },
    { passive: true }
  );

  // -------------------------------------------------------
  // Animated ocean particles
  // -------------------------------------------------------

  const canvas = document.getElementById("ocean-canvas");
  const context = canvas.getContext("2d");

  if (context) {
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;
    let bubbles = [];
    let motes = [];
    let bubbleSprite = null;
    let moteSprite = null;
    let particleFrame = 0;
    let lastFrameTime = 0;
    let staticDrawn = false;

    const makeBubbleSprite = () => {
      const size = 96;
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const spriteContext = sprite.getContext("2d");
      const center = size / 2;
      const radius = size * 0.38;

      const gradient = spriteContext.createRadialGradient(
        center,
        center,
        radius * 0.08,
        center,
        center,
        radius
      );
      gradient.addColorStop(0, "rgba(205, 255, 250, 0.015)");
      gradient.addColorStop(0.58, "rgba(170, 250, 245, 0.02)");
      gradient.addColorStop(0.84, "rgba(185, 255, 250, 0.08)");
      gradient.addColorStop(0.94, "rgba(216, 255, 252, 0.3)");
      gradient.addColorStop(1, "rgba(216, 255, 252, 0)");

      spriteContext.beginPath();
      spriteContext.arc(center, center, radius, 0, Math.PI * 2);
      spriteContext.fillStyle = gradient;
      spriteContext.fill();

      spriteContext.beginPath();
      spriteContext.arc(center, center, radius * 0.85, Math.PI * 1.05, Math.PI * 1.52);
      spriteContext.strokeStyle = "rgba(232, 255, 253, 0.25)";
      spriteContext.lineWidth = 1.4;
      spriteContext.stroke();

      spriteContext.beginPath();
      spriteContext.arc(center - radius * 0.32, center - radius * 0.38, radius * 0.08, 0, Math.PI * 2);
      spriteContext.fillStyle = "rgba(255, 255, 255, 0.48)";
      spriteContext.fill();

      return sprite;
    };

    const makeMoteSprite = () => {
      const size = 24;
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const spriteContext = sprite.getContext("2d");
      const center = size / 2;
      const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);

      gradient.addColorStop(0, "rgba(229, 255, 253, 0.72)");
      gradient.addColorStop(0.22, "rgba(171, 255, 246, 0.3)");
      gradient.addColorStop(0.65, "rgba(120, 238, 229, 0.06)");
      gradient.addColorStop(1, "rgba(120, 238, 229, 0)");

      spriteContext.beginPath();
      spriteContext.arc(center, center, center, 0, Math.PI * 2);
      spriteContext.fillStyle = gradient;
      spriteContext.fill();

      return sprite;
    };

    const createParticles = () => {
      const mobile = width < 680;
      const bubbleCount = mobile ? 11 : 18;
      const moteCount = mobile ? 22 : 42;

      bubbles = Array.from({ length: bubbleCount }, (_, index) => {
        const radius = 1.2 + Math.random() * 4.8;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          speed: 4 + Math.random() * 13 + radius * 0.7,
          drift: 4 + Math.random() * 10,
          alpha: 0.14 + Math.random() * 0.32,
          phase: Math.random() * Math.PI * 2,
          wobble: 0.4 + Math.random() * 0.7,
          shimmer: 0.6 + Math.random() * 1.8,
          delay: index * 0.17
        };
      });

      motes = Array.from({ length: moteCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.45 + Math.random() * 1.3,
        speed: 2 + Math.random() * 9,
        drift: 2 + Math.random() * 9,
        alpha: 0.08 + Math.random() * 0.42,
        phase: Math.random() * Math.PI * 2,
        wobble: 0.2 + Math.random() * 0.55
      }));
    };

    const resizeParticles = () => {
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      createParticles();
      staticDrawn = false;

      if (REDUCED_MOTION.matches) {
        drawParticles(performance.now());
      }
    };

    const drawParticles = (time) => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      motes.forEach((mote) => {
        const wobbleX = Math.sin(time * 0.00033 * mote.wobble + mote.phase) * mote.drift;
        const twinkle = 0.55 + Math.sin(time * 0.0012 + mote.phase) * 0.45;
        const x = (mote.x + wobbleX + width) % width;
        const y = (mote.y + height) % height;
        const size = mote.radius * 7;
        context.globalAlpha = Math.max(0, mote.alpha * twinkle);
        if (moteSprite) {
          context.drawImage(moteSprite, x - size / 2, y - size / 2, size, size);
        }
      });

      bubbles.forEach((bubble) => {
        const wobbleX = Math.sin(time * 0.00022 * bubble.wobble + bubble.phase) * bubble.drift;
        const x = (bubble.x + wobbleX + width) % width;
        const y = (bubble.y + height) % height;
        const size = bubble.radius * 5;
        const pulse = 0.75 + Math.sin(time * 0.0009 * bubble.shimmer + bubble.phase) * 0.25;
        context.globalAlpha = Math.max(0, bubble.alpha * pulse);
        if (bubbleSprite) {
          context.drawImage(bubbleSprite, x - size / 2, y - size / 2, size, size);
        }
      });

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    };

    const animateParticles = (time) => {
      const delta = Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;

      if (!document.hidden) {
        motes.forEach((mote) => {
          mote.y -= mote.speed * delta;
          mote.x += Math.sin(time * 0.00034 * mote.wobble + mote.phase) * 0.13;
          if (mote.y < -20) {
            mote.y = height + 20;
            mote.x = Math.random() * width;
          }
        });

        bubbles.forEach((bubble) => {
          bubble.y -= bubble.speed * delta;
          bubble.x += Math.sin(time * 0.00024 * bubble.wobble + bubble.phase) * 0.2;
          if (bubble.y < -60) {
            bubble.y = height + bubble.radius * 4;
            bubble.x = Math.random() * width;
          }
        });

        drawParticles(time);
      }

      particleFrame = window.requestAnimationFrame(animateParticles);
    };

    const startParticles = () => {
      bubbleSprite = makeBubbleSprite();
      moteSprite = makeMoteSprite();
      resizeParticles();

      if (REDUCED_MOTION.matches) {
        if (!staticDrawn) {
          drawParticles(performance.now());
          staticDrawn = true;
        }
        return;
      }

      if (!particleFrame) {
        lastFrameTime = performance.now();
        particleFrame = window.requestAnimationFrame(animateParticles);
      }
    };

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeParticles, 160);
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !REDUCED_MOTION.matches && !particleFrame) {
        lastFrameTime = performance.now();
        particleFrame = window.requestAnimationFrame(animateParticles);
      }
    });

    startParticles();
  }

  // -------------------------------------------------------
  // Initial state & preloader
  // -------------------------------------------------------

  const initialIndex = getIndexFromHash();
  story.dataset.direction = "next";
  updateInterface(initialIndex);

  if (initialIndex !== 0) {
    slides.forEach((slide, index) => {
      const isTarget = index === initialIndex;
      slide.classList.toggle("is-active", isTarget);
      slide.setAttribute("aria-hidden", String(!isTarget));
      if (isTarget) {
        slide.removeAttribute("inert");
      } else {
        slide.setAttribute("inert", "");
      }
    });
    currentIndex = initialIndex;
    updateInterface(initialIndex);
  }

  window.history.replaceState(null, "", `#slide-${currentIndex + 1}`);

  let pageRevealed = false;

  const revealPage = () => {
    if (pageRevealed) return;
    pageRevealed = true;
    doc.classList.add("is-ready");
    doc.classList.remove("is-loading");
    window.setTimeout(() => {
      const preloader = document.getElementById("preloader");
      if (preloader) preloader.remove();
    }, 1150);
  };

  window.addEventListener("load", () => {
    window.setTimeout(revealPage, 420);
  }, { once: true });

  window.setTimeout(revealPage, 3200);

  // Warm the other backgrounds after the first view is already usable.
  window.setTimeout(() => {
    ["02", "03", "04", "05", "06", "07", "08"].forEach((number) => {
      const image = new Image();
      image.src = `assets/images/slide-${number}.jpg`;
    });
  }, 1400);
})();
