// Category showcase — the dark full-screen "display" panel holding a
// category's artwork. SHARED by the public site and the admin preview, so both
// open the exact same panel. Any element with [data-category-open] +
// [data-category="…"] opens it: on the site that's the category card buttons
// and the workshop-date buttons; in the admin it's the per-album Preview button.
//
// The panel grows out of the clicked source and shrinks back into it on close,
// via FLIP: measure the source, start the panel transformed onto it, then
// release it to its natural size and let CSS transition the difference. No
// animation library needed. openShowcase()/closeShowcase() are the only entry
// and exit points — keep it that way so there's one path to reason about.
(function () {
  var showcase = document.querySelector("[data-showcase]");
  if (!showcase) return;

  var panel = showcase.querySelector(".showcase__panel");
  var CLOSE_MS = 580; // keep in step with the .showcase__panel transition
  var CARD_RADIUS = 10; // must match .card border-radius in style.css
  var lastTrigger = null;
  var hideTimer = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Transform that maps the panel exactly onto the element the showcase grows
  // out of / collapses back into: the FRONT CARD of a stack (portfolio) or the
  // clicked button itself (a workshop date, or the admin Preview button). Any
  // fan is snapped to rest before measuring, so a half-finished hover can't give
  // the wrong rect. Returns {transform, radius} or null.
  function transformOntoSource(trigger) {
    var cat = trigger.closest(".category");
    var srcRect, radiusPx, uniform;
    if (cat) {
      // portfolio: match the front card's actual rect (a proper rectangle,
      // so a non-uniform scale reads as a natural unfold)
      var cardsEl = cat.querySelector(".cards");
      var target = cat.querySelector(".card--5") || cat;
      var prevTransition = cardsEl ? cardsEl.style.transition : null;
      if (cardsEl) {
        cardsEl.style.transition = "none";
        cardsEl.getBoundingClientRect(); // flush, so we measure the settled rect
      }
      srcRect = target.getBoundingClientRect();
      if (cardsEl) cardsEl.style.transition = prevTransition || "";
      radiusPx = CARD_RADIUS;
      uniform = false;
    } else {
      // a thin control (workshop date button, admin Preview button): grow from
      // its CENTRE with a UNIFORM scale, so the panel starts as a small
      // proportionate panel and grows cleanly — never a flat horizontal sliver.
      srcRect = trigger.getBoundingClientRect();
      radiusPx =
        parseFloat(getComputedStyle(trigger).borderTopLeftRadius) || CARD_RADIUS;
      uniform = true;
    }

    var pr = panel.getBoundingClientRect(); // natural, untransformed
    if (!pr.width || !pr.height || !srcRect.width) return null;

    var sx = srcRect.width / pr.width;
    var sy = uniform ? sx : srcRect.height / pr.height;
    var tx = srcRect.left + srcRect.width / 2 - (pr.left + pr.width / 2);
    var ty = srcRect.top + srcRect.height / 2 - (pr.top + pr.height / 2);
    return {
      transform: "translate(" + tx + "px," + ty + "px) scale(" + sx + "," + sy + ")",
      // Counter the scale-down so the corners still read as the source's
      // radius while the panel is source-sized
      radius: radiusPx / sx + "px",
    };
  }

  function openShowcase(trigger) {
    lastTrigger = trigger || null;
    var ball = trigger ? trigger.closest(".category") : null;

    // Remember which category opened it — the artwork will need this
    var name = trigger ? trigger.dataset.category || trigger.textContent.trim() : "";
    showcase.dataset.category = name;
    if (panel) panel.setAttribute("aria-label", name ? name + " artwork" : "Artwork");

    // Show only this category's stage
    showcase.querySelectorAll("[data-stage]").forEach(function (stage) {
      stage.hidden = stage.dataset.stage !== name;
    });

    window.clearTimeout(hideTimer);
    showcase.hidden = false;
    document.body.classList.add("is-showcase-open");

    if (trigger && panel && !prefersReducedMotion()) {
      // Measure from a clean slate, then sit on the clicked source.
      // Clearing opacity here (transitions off) resets any fade left by a
      // previous close instantly — the open must not fade in.
      panel.style.transition = "none";
      panel.style.transform = "";
      panel.style.borderRadius = "";
      panel.style.opacity = "";
      var start = transformOntoSource(trigger);
      if (start) {
        panel.style.transform = start.transform;
        panel.style.borderRadius = start.radius;
        panel.getBoundingClientRect(); // force the browser to apply it
        if (ball) ball.classList.add("is-opening"); // hide the fan (portfolio)
        // ...then release: CSS transitions it out to full size
        window.requestAnimationFrame(function () {
          panel.style.transition = "";
          panel.style.transform = "";
          panel.style.borderRadius = "";
          showcase.dataset.state = "open";
        });
        focusBack();
        return;
      }
      panel.style.transition = "";
    }

    window.requestAnimationFrame(function () {
      showcase.dataset.state = "open";
    });
    focusBack();
  }

  function focusBack() {
    var back = showcase.querySelector(".showcase__back");
    if (back) back.focus();
  }

  // A trigger the page stack copies into its band has a twin: the real control
  // back in the section it came from. `inBand` picks which of the two you want.
  function twinFor(el, inBand) {
    var key = el && el.getAttribute && el.getAttribute("data-category");
    if (!key) return null;
    var all = document.querySelectorAll(
      '[data-category-open][data-category="' + key + '"]'
    );
    for (var i = 0; i < all.length; i++) {
      if (!!all[i].closest(".stack-strip") !== inBand) continue;
      var r = all[i].getBoundingClientRect();
      if (r.width && r.height) return all[i];
    }
    return null;
  }

  function closeShowcase() {
    if (showcase.hidden) return;

    // The element that was clicked may be gone by now — the page stack rebuilds
    // its copies whenever the window changes — and a element that isn't in the
    // page measures zero, which would leave the panel frozen with no animation
    // at all. Collapse onto its live twin instead.
    if (lastTrigger && !lastTrigger.isConnected) {
      lastTrigger = twinFor(lastTrigger, true) || twinFor(lastTrigger, false);
    }

    var ball = lastTrigger ? lastTrigger.closest(".category") : null;

    // Restore the stack before measuring — it's hidden behind the panel
    // anyway, so snapping it back is invisible.
    if (ball) ball.classList.remove("is-opening");

    if (lastTrigger && panel && !prefersReducedMotion()) {
      var end = transformOntoSource(lastTrigger);
      if (end) {
        panel.style.transform = end.transform;
        panel.style.borderRadius = end.radius;
        panel.style.opacity = "0"; // fades out as it settles back on the source
      } else {
        // Nothing left to collapse onto: still fade it away rather than let it
        // sit there until the timer yanks it off the screen.
        panel.style.transform = "scale(0.96)";
        panel.style.opacity = "0";
      }
    }

    showcase.dataset.state = "closed";
    document.body.classList.remove("is-showcase-open");

    hideTimer = window.setTimeout(function () {
      if (showcase.dataset.state !== "closed") return;
      showcase.hidden = true;
      if (panel) {
        panel.style.transition = "none";
        panel.style.transform = "";
        panel.style.borderRadius = "";
        panel.style.opacity = "";
        panel.getBoundingClientRect();
        panel.style.transition = "";
      }
    }, CLOSE_MS);

    // Focus belongs on a real control, never on a copy in the band: those are
    // aria-hidden and deliberately out of the tab order.
    var focusable =
      lastTrigger && lastTrigger.closest(".stack-strip")
        ? twinFor(lastTrigger, false)
        : lastTrigger;
    if (focusable) focusable.focus();
  }

  // Delegated, so it also works for copies made later — the page stack clones
  // the card stacks into its title band, and those copies open the same panel,
  // growing out of wherever the copy the visitor clicked actually sits.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-category-open]");
    if (btn) openShowcase(btn);
  });

  showcase.querySelectorAll("[data-showcase-close]").forEach(function (el) {
    el.addEventListener("click", closeShowcase);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !showcase.hidden) closeShowcase();
  });
})();

// Build the scrollable masonry wall inside each showcase stage from the shared
// GALLERY data. Runs on both pages; each stage is filled once. The images keep
// their own aspect ratios and tile into two columns (see .gallery in showcase.css).
(function () {
  if (!window.GALLERY) return;
  document.querySelectorAll(".showcase__stage[data-stage]").forEach(function (stage) {
    var name = stage.dataset.stage;
    var imgs = window.GALLERY[name] || [];
    if (!imgs.length || stage.querySelector(".gallery")) return;

    var gallery = document.createElement("div");
    gallery.className = "gallery";
    var grid = document.createElement("div");
    grid.className = "gallery__grid";
    imgs.forEach(function (rel, i) {
      var im = document.createElement("img");
      im.className = "gallery__item";
      im.src = window.gallerySrc(rel);
      im.loading = "lazy";
      im.alt = name + " artwork " + (i + 1);
      grid.appendChild(im);
    });
    gallery.appendChild(grid);
    stage.appendChild(gallery);
  });
})();
