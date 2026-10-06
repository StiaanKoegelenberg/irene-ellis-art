// Ring binding — fill the right-edge coil with evenly-spaced rings sized
// to the whole document. Re-runs when the page height changes (fonts load,
// window resizes, the showcase opens/closes) so the coil always reaches the
// bottom. Each ring is a <use> of the single #bindRing symbol.
(function () {
  var svg = document.querySelector(".binding__svg");
  if (!svg) return;
  var stack = document.querySelector(".page-stack");

  var SVGNS = "http://www.w3.org/2000/svg";
  var XLINK = "http://www.w3.org/1999/xlink";
  var WIDTH = 104; // must match .binding width in CSS
  var PERIOD = 56; // vertical gap between rings
  var TOP = 24; // first ring offset from the very top
  var RING_W = 150; // symbol native width (extends off the edge, gets clipped)
  var RING_H = 66;
  // Rings stop this far above the document bottom, so the page ends after
  // the last ring and the bottom cascade has room. Must clear the 46px
  // page-edge strip (body padding-bottom) plus the ring's own height.
  var BOTTOM_STOP = 120;
  // On a phone the coil is drawn at half size (the .binding box is half as
  // wide there too — see style.css). Same breakpoint as the rest of the site.
  var PHONE = window.matchMedia("(max-width: 640px)");
  var lastKey = "";

  function docHeight() {
    // body.offsetHeight = content + padding, but NOT the absolutely
    // positioned overlays (binding/page-stack). Using scrollHeight here
    // creates a feedback loop: the overlays are sized to it, then their
    // own boxes inflate it, so it never settles.
    return Math.max(
      document.body.offsetHeight,
      document.documentElement.clientHeight
    );
  }

  function fill() {
    var h = docHeight();
    var w = document.documentElement.clientWidth;
    // S = how big the rings are drawn: 1 = full size, 0.5 = half (phones).
    // The rings are still laid out in full-size units; a viewBox twice as
    // tall as the page squeezes the whole drawing to half on screen.
    var S = PHONE.matches ? 0.5 : 1;
    var count = Math.max(1, Math.floor((h - TOP * S - BOTTOM_STOP) / (PERIOD * S)) + 1);

    var key = count + "x" + h + "x" + w + "x" + S;
    if (key === lastKey) return; // nothing changed
    lastKey = key;

    // --- rings ---
    svg.setAttribute("viewBox", "0 0 " + WIDTH + " " + h / S);
    svg.setAttribute("height", h);

    // The coil is the book's SPINE: evenly spaced the whole way down, fixed
    // while the pages slide under it. (We once removed the ring at each
    // section seam. The page stack moves those seams as sections stack, so
    // the gaps drifted into the middle of a page and read as missing rings.)
    var old = svg.querySelectorAll("use");
    for (var i = 0; i < old.length; i++) old[i].remove();
    for (var j = 0; j < count; j++) {
      var use = document.createElementNS(SVGNS, "use");
      use.setAttributeNS(XLINK, "xlink:href", "#bindRing");
      use.setAttribute("href", "#bindRing");
      use.setAttribute("x", "0");
      use.setAttribute("y", TOP + j * PERIOD);
      use.setAttribute("width", RING_W);
      use.setAttribute("height", RING_H);
      svg.appendChild(use);
    }

    // --- cascading page-stack edges (left + bottom + rounded corner) ---
    if (stack) drawCascade(w, h);
  }

  function drawCascade(W, H) {
    var N = 6; // number of stacked pages showing
    var s = 3.2; // how far each deeper page peeks past the one above it
    var R = 15; // rounded bottom-left corner radius
    var frontLeftX = 18; // top page's left edge, inset into the margin
    // Top page's bottom edge. The deepest page sits (N-1)*s = 16px below this,
    // so H-17 lands that last line ~1px off the document bottom — i.e. the
    // cascade finishes exactly where the page finishes, with no gap after it.
    var frontBottomY = H - 17;

    var d = "";
    for (var i = 0; i < N; i++) {
      var vx = frontLeftX - i * s; // deeper pages sit further left
      var by = frontBottomY + i * s; // and further down
      var op = (0.5 - i * 0.06).toFixed(2);
      var path =
        "M" + vx.toFixed(1) + ",0" + // top of the left edge
        " L" + vx.toFixed(1) + "," + (by - R).toFixed(1) +
        " A" + R + " " + R + " 0 0 0 " + (vx + R).toFixed(1) + "," + by.toFixed(1) +
        " L" + W + "," + by.toFixed(1); // bottom edge to the right
      d +=
        '<path d="' + path + '" fill="none" stroke="#5a4d44" ' +
        'stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" ' +
        'opacity="' + op + '"/>';
    }
    stack.setAttribute("viewBox", "0 0 " + W + " " + H);
    stack.setAttribute("width", W);
    stack.setAttribute("height", H);
    stack.innerHTML = d;
  }

  fill();
  window.addEventListener("load", fill);
  window.addEventListener("resize", fill);
  setTimeout(fill, 400);
  setTimeout(fill, 1200);
})();

// Scroll reveal — progressive enhancement.
// Elements marked with .reveal start hidden (via CSS scoped to .js-reveal)
// and fade/rise in as they scroll into view. Uses IntersectionObserver,
// which works in all modern browsers, Safari included. If JavaScript or
// the observer is unavailable, the content simply stays visible.
(function () {
  var root = document.documentElement;
  root.classList.add("js-reveal");

  var targets = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || !targets.length) {
    targets.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  // Toggle on every enter/leave so the reveal replays each time an
  // element scrolls back into view (not just once).
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });

  // Content drawn after load (the workshop dates, once they come from the
  // database) has to be handed to the same observer, or it sits at opacity 0
  // forever waiting for a reveal that never comes.
  window.IEA_REVEAL = observer;
})();

// Portfolio fanned cards — fill each category's stack with its images. The
// image lists live in gallery-data.js (window.GALLERY) — the ONE source of
// truth, shared with the dark gallery (built in showcase.js) and the admin
// preview. The front card (card--5) shows the category's first image.
(function () {
  if (!window.GALLERY) return;
  document.querySelectorAll(".category").forEach(function (cat) {
    var btn = cat.querySelector("[data-category]");
    var imgs = (btn && window.GALLERY[btn.dataset.category]) || [];
    var cards = cat.querySelectorAll(".card");
    cards.forEach(function (card, i) {
      var rel = imgs[cards.length - 1 - i]; // reverse: last card is front
      if (!rel) return;
      card.style.backgroundImage = 'url("' + window.gallerySrc(rel) + '")';
      card.classList.add("card--filled");
    });
  });
})();

// Smooth in-page navigation — animate the scroll to a section instead of
// jumping abruptly when a nav link (or any in-page anchor) is clicked.
//
// SCROLL_MS is the single knob for speed: larger = slower, smaller = faster.
(function () {
  var SCROLL_MS = 700; // duration of the smooth scroll, in ms — tune freely

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rafId = null;

  // ease-in-out so it starts and ends gently rather than at a constant speed
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, done) {
    if (rafId) cancelAnimationFrame(rafId);
    var startY = window.pageYOffset;
    var dist = targetY - startY;
    if (Math.abs(dist) < 1) {
      if (done) done();
      return;
    }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / SCROLL_MS);
      window.scrollTo(0, startY + dist * easeInOutCubic(p));
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
        if (done) done();
      }
    }
    rafId = requestAnimationFrame(step);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id.length < 2) return; // bare "#", nothing to scroll to
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      // natural layout position: stack.js records it on the sections it pins,
      // since a stuck sticky page isn't where its content lives in the scroll
      var top;
      if (target.dataset.navTop != null) {
        top = +target.dataset.navTop;
      } else if (target.dataset.naturalTop != null) {
        top = +target.dataset.naturalTop;
      } else {
        top = 0;
        for (var n = target; n; n = n.offsetParent) {
          top += n.offsetTop + (n.offsetParent ? n.offsetParent.clientTop : 0);
        }
      }
      if (reduce) {
        window.scrollTo(0, top);
        history.pushState(null, "", id);
        return;
      }
      smoothScrollTo(top, function () {
        history.pushState(null, "", id);
      });
    });
  });
})();

// About — "Continue reading" (phones only; the button is hidden on bigger
// screens, where the whole story simply shows). Opening and closing is just
// a class: the smooth unfold itself is CSS (style.css, PHONE LAYOUT).
(function () {
  var btn = document.querySelector(".about__toggle");
  var more = document.getElementById("about-more");
  if (!btn || !more) return;
  btn.addEventListener("click", function () {
    var open = !more.classList.contains("is-open");
    more.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Show less" : "Continue reading";
    // Folding the story away pulls the button up the page; once it has
    // settled, bring it back into view if it ended up above the screen.
    if (!open) {
      setTimeout(function () {
        if (btn.getBoundingClientRect().top < 0) {
          btn.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 620);
    }
  });
})();

// Phone swipe rows — on a phone the Workshop Dates months and the Portfolio
// card stacks sit in rows you swipe sideways (the layout is in style.css,
// PHONE LAYOUT). This adds the small dots under each row showing which card
// you are on, and marks that card with .is-current: the portfolio stack in
// view fans open, standing in for the hover a mouse gives it on a computer.
// On bigger screens the rows don't scroll and the dots are hidden, so none
// of this shows.
(function () {
  var ROWS = [
    { row: "#workshop-dates .workshops__grid", item: ".workshops__month" },
    { row: "#portfolio .portfolio__objects", item: ".category" },
  ];
  var rebuilds = [];

  ROWS.forEach(function (def) {
    var row = document.querySelector(def.row);
    if (!row) return;
    var dots = document.createElement("div");
    dots.className = "swipe-dots";
    dots.setAttribute("aria-hidden", "true"); // a visual hint only
    row.parentNode.insertBefore(dots, row.nextSibling);

    var items = [];
    var ticking = false;

    // The card whose middle is nearest the middle of the row's visible area
    // (the area between the page edge and the rings, set by scroll-padding).
    function update() {
      ticking = false;
      if (!items.length) return;
      var cs = getComputedStyle(row);
      var box = row.getBoundingClientRect();
      var left = box.left + (parseFloat(cs.scrollPaddingLeft) || 0);
      var right = box.right - (parseFloat(cs.scrollPaddingRight) || 0);
      var mid = (left + right) / 2;
      var best = 0;
      var bestGap = Infinity;
      items.forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        var gap = Math.abs(r.left + r.width / 2 - mid);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      items.forEach(function (el, i) {
        el.classList.toggle("is-current", i === best);
      });
      for (var i = 0; i < dots.children.length; i++) {
        dots.children[i].classList.toggle("is-on", i === best);
      }
    }

    function build() {
      items = [].slice.call(row.querySelectorAll(def.item));
      dots.innerHTML = items
        .map(function () {
          return "<span></span>";
        })
        .join("");
      dots.hidden = items.length < 2; // one card needs no dots
      update();
    }

    row.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    build();
    rebuilds.push(build);
  });

  // The workshop months are redrawn once the saved dates arrive from the
  // database (content.js), so count the cards again then.
  document.addEventListener("content:updated", function () {
    rebuilds.forEach(function (b) {
      b();
    });
  });
})();
