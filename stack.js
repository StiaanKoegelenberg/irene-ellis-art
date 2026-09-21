// Page stack — Workshop Dates, Portfolio and Get In Touch slide over one
// another like pages being laid onto a pile, each leaving its title strip
// visible in a band at the top of the screen. (Hero + About scroll normally.)
//
// NO PAGE is ever scaled — every one keeps its full, natural size. (On a
// narrow screen the copied TITLES shrink as they dock, because three
// full-size script titles would take most of a phone screen. The pages
// themselves never do.) Per part:
//   1. It scrolls normally.
//   2. When its title strip (top border + eyebrow + script title) reaches its
//      slot in the band, a copy of that strip sticks there and the rest of the
//      page carries on scrolling up underneath it.
//   3. Once the page has been read to its end — or, if it fits on screen, as
//      soon as its strip sticks — the page pins and the next part slides up
//      over it. The last part never pins.
//
// All of that movement is the browser's own position:sticky, which moves in
// lockstep with scrolling (script-driven transforms lag a frame and shake).
// This script only measures, sets each element's sticky offset, and fades the
// strip backgrounds. The sections themselves are wrapped, never edited.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var PAD = 14; // space kept below each title inside its strip
  var MIN_WIDTH = 360; // below this there is no room for the effect at all
  // A phone cannot give 60% of its screen to three full-size script titles.
  // Below this width the titles DOCK instead: each shrinks into its slot as it
  // catches, bringing the band to about a quarter of the screen. Wider screens
  // keep the titles at full size, and the card tops that ride with them.
  var NARROW = 900;
  var DOCK = 0.55; // a docked title's size, next to the section's own
  var DOCK_GAP = 10; // space above a docked title inside its slot
  var MIN_ROOM = 150; // px the full band must leave free, or it's disabled
  var TOOLBAR = 140; // a height change up to this is a phone's address bar
  // Depth: every part stacked ON TOP of a strip washes its title a little
  // further toward its own background, the way distance pales a thing in the
  // open air. Its border is left crisp, so the seams stay sharp.
  var FADE_STEP = 0.09;
  var FADE_MAX = 0.2;
  var IDS = ["workshop-dates", "portfolio", "contact"];
  // Content that rides in the band with its title, at full size, cut off
  // where the next part's top border is — so its top stays in view while the
  // rest tucks under the section that covers it.
  var EXTRAS = {
    "workshop-dates": ".workshops__grid",
    portfolio: ".portfolio__objects",
  };

  var root = document.documentElement;
  var main = document.querySelector("main");
  if (!main) return;

  // Sections in document order (before wrapping), so each part knows the
  // section directly above it — needed to find the line drawn at its seam.
  var allSecs = Array.prototype.filter.call(main.children, function (el) {
    return el.tagName === "SECTION";
  });

  var parts = [];
  IDS.forEach(function (id, i) {
    var sec = document.getElementById(id);
    if (!sec) return;
    var page = document.createElement("div");
    page.className = "stack-page" + (i === IDS.length - 1 ? " stack-page--last" : "");
    sec.parentNode.insertBefore(page, sec);
    page.appendChild(sec);
    parts.push({
      page: page,
      sec: sec,
      prev: allSecs[allSecs.indexOf(sec) - 1] || null,
      titles: [sec.querySelector(".section-eyebrow"), sec.querySelector("h2")].filter(Boolean),
      extras: EXTRAS[id] ? [].slice.call(sec.querySelectorAll(EXTRAS[id])) : [],
      seeds: [], // stray dandelions inside the band — found when measuring
      strip: null,
      bg: null,
      clones: [],
      extraClones: [],
    });
  });
  if (!parts.length) return;

  // Layout position, independent of sticky offsets and the reveal animation's
  // transform (both of which make on-screen rects lie about where things live).
  function docTop(el) {
    var y = 0;
    for (; el; el = el.offsetParent) {
      y += el.offsetTop + (el.offsetParent ? el.offsetParent.clientTop : 0);
    }
    return y;
  }
  function docLeft(el) {
    var x = 0;
    for (; el; el = el.offsetParent) {
      x += el.offsetLeft + (el.offsetParent ? el.offsetParent.clientLeft : 0);
    }
    return x;
  }

  // The line drawn at this part's top seam on the normal page: its own top
  // border, its own top ::before hairline, or the bottom ::after hairline of
  // the section above. Its strip carries a copy, so the border stays put.
  function seamLine(p) {
    var cs = getComputedStyle(p.sec);
    var bw = parseFloat(cs.borderTopWidth) || 0;
    if (bw > 0 && cs.borderTopStyle !== "none") {
      return { height: bw + "px", backgroundColor: cs.borderTopColor, backgroundImage: "none" };
    }
    var b = getComputedStyle(p.sec, "::before");
    if (b.content !== "none" && b.position === "absolute" && b.top === "0px") {
      return { height: b.height, backgroundColor: b.backgroundColor, backgroundImage: b.backgroundImage };
    }
    if (p.prev) {
      var a = getComputedStyle(p.prev, "::after");
      if (a.content !== "none" && a.position === "absolute" && a.bottom === "0px") {
        return { height: a.height, backgroundColor: a.backgroundColor, backgroundImage: a.backgroundImage };
      }
    }
    return null;
  }

  // One copy of a live element, pinned in the strip exactly where the original
  // sits inside its section. Interactive copies (the card stacks) keep their
  // own size and stay clickable; the strip itself never clips them.
  function place(el, face, p, mainLeft, interactive) {
    var c = el.cloneNode(true);
    c.removeAttribute("id");
    c.style.position = "absolute";
    c.style.margin = "0";
    c.style.left = docLeft(el) - mainLeft + "px";
    c.style.top = docTop(el) - p.T + "px";
    c.style.width = el.offsetWidth + "px";
    c.style.lineHeight = getComputedStyle(el).lineHeight;
    if (interactive) {
      c.style.height = el.offsetHeight + "px";
      c.style.pointerEvents = "auto"; // clickable even before the strip is solid
    }
    // the strip is aria-hidden, so nothing inside it may take keyboard focus;
    // the real buttons in the page stay the ones a keyboard reaches
    c.querySelectorAll("a[href], button, input, select, textarea, [tabindex]").forEach(
      function (f) {
        f.tabIndex = -1;
      }
    );
    face.appendChild(c);
    return c;
  }

  var enabled = false;
  var compact = false; // narrow screen: titles dock, nothing else rides along
  var VH = 0;
  var measuredW = 0; // the screen this layout was measured against
  var measuredH = 0;
  var mainEnd = 0;

  function teardown() {
    root.classList.remove("stack-on");
    parts.forEach(function (p) {
      if (p.strip) p.strip.remove();
      p.strip = p.bg = p.face = p.hang = null;
      p.clones = [];
      p.extraClones = [];
      p.extras.forEach(function (el) {
        el.style.pointerEvents = "";
      });
      delete p.sec.dataset.navTop;
      delete p.sec.dataset.naturalTop;
      p.titles.concat(p.extras, p.seeds).forEach(function (t) {
        t.style.opacity = "";
      });
      p.seeds = [];
    });
  }

  function measure() {
    teardown(); // sticky off, so everything below reads its natural layout
    VH = window.innerHeight;
    measuredW = window.innerWidth;
    measuredH = VH;

    // Pass 1 — how tall is each band? Its own title block decides that.
    compact = window.innerWidth < NARROW;
    var C = 0; // running band height = the slot where the next strip sticks
    parts.forEach(function (p) {
      p.T = docTop(p.page);
      var h2 = p.titles[p.titles.length - 1]; // the script title, under the eyebrow
      p.titleTop = docTop(h2) - p.T;
      var bot = -Infinity;
      p.titles.forEach(function (t) {
        bot = Math.max(bot, docTop(t) + t.offsetHeight);
      });
      // Docked, a slot holds only the shrunken title. At full size it holds the
      // whole title block, laid out exactly as the section draws it.
      p.S = compact
        ? DOCK_GAP + h2.offsetHeight * DOCK + PAD
        : bot - p.T + PAD; // strip runs from the section's top edge
      C += p.S;
    });

    enabled = window.innerWidth >= MIN_WIDTH && VH - C >= MIN_ROOM;
    if (!enabled) return; // plain scrolling page, left exactly as it is

    // Pass 2 — the slots, now that every band's height is known.
    C = 0;
    parts.forEach(function (p) {
      p.T = docTop(p.page);
      p.H = p.page.offsetHeight;
      p.sec.dataset.naturalTop = p.T; // for the nav buttons (see script.js)
      p.C = C;
      C += p.S;
      // Pin once read to the end, or — if it fits — as soon as its strip sticks.
      p.P = Math.min(p.C, VH - p.H);
    });
    mainEnd = docTop(main) + main.offsetHeight;

    var mainLeft = docLeft(main);
    parts.forEach(function (p) {
      var strip = document.createElement("div");
      strip.className = "stack-strip";
      strip.setAttribute("aria-hidden", "true"); // the real headings stay the accessible ones
      strip.style.setProperty("--stick", p.C + "px");
      strip.style.height = p.S + "px";
      strip.style.marginBottom = -p.S + "px"; // takes no room in the flow

      var bg = document.createElement("div");
      bg.className = "stack-strip__bg";
      bg.style.backgroundColor = getComputedStyle(p.sec).backgroundColor;
      strip.appendChild(bg);

      // Everything that fades with depth lives on this layer: the background
      // behind it stays solid, so the page underneath never shows through.
      var face = document.createElement("div");
      face.className = "stack-strip__face";
      // Set here, not only in the stylesheet: these hold the copies in place
      // and do the cutting. A stale cached stylesheet would otherwise leave
      // the copies uncut and floating over the section below.
      face.style.cssText = "position:absolute;top:0;right:0;bottom:0;left:0";

      var line = seamLine(p);
      if (line) {
        var edge = document.createElement("div");
        edge.className = "stack-strip__edge";
        edge.style.height = line.height;
        edge.style.backgroundColor = line.backgroundColor;
        edge.style.backgroundImage = line.backgroundImage;
        strip.appendChild(edge);
      }

      // Copies of the real eyebrow + title, in a box that shrinks as one when
      // the title docks. Its origin is the title's own top-left, so a docked
      // title lands in the top of its slot rather than drifting off it.
      var h2 = p.titles[p.titles.length - 1];
      var boxLeft = docLeft(h2) - mainLeft;
      var titleBox = document.createElement("div");
      titleBox.className = "stack-strip__title";
      titleBox.style.cssText = "position:absolute;transform-origin:left top";
      titleBox.style.left = boxLeft + "px";
      titleBox.style.top = p.titleTop + "px";
      face.appendChild(titleBox);
      p.clones = p.titles.map(function (t) {
        var c = place(t, titleBox, p, mainLeft, false);
        c.style.left = docLeft(t) - mainLeft - boxLeft + "px";
        c.style.top = docTop(t) - p.T - p.titleTop + "px";
        return c;
      });
      strip.style.setProperty(
        "--dock",
        "translateY(" + (DOCK_GAP - p.titleTop) + "px) scale(" + DOCK + ")"
      );
      // Anything else that rides in the band — Portfolio's card stacks. They
      // keep their full size and hang below the strip, but only as far as the
      // next part's top border: this layer is cut off exactly there each
      // frame, so they tuck UNDER Get In Touch instead of floating over it.
      if (!compact && p.extras.length) {
        p.hang = document.createElement("div");
        p.hang.className = "stack-strip__hang";
        p.hang.style.cssText =
          "position:absolute;left:0;right:0;top:0;overflow:hidden;pointer-events:none";
        face.appendChild(p.hang);
        p.extraClones = p.extras.map(function (el) {
          var c = place(el, p.hang, p, mainLeft, true);
          // A copy never scrolls into view of its own accord, so anything in
          // it that fades in on scroll (the month cards do) would sit there
          // invisible forever. Show them outright.
          if (c.classList.contains("reveal")) c.classList.add("is-visible");
          c.querySelectorAll(".reveal").forEach(function (r) {
            r.classList.add("is-visible");
          });
          return c;
        });
      }
      // Stray dandelion seeds that live inside the band drift along with it.
      // The band covers the section's own top, so without this they would
      // blink out the instant it turned solid. One that straddles the band's
      // edge is left where it is, to slide under as the page moves.
      // These are <svg>, which has no offsetTop, and each one is drifting on
      // its own animation — so read where it SITS from its style, not from a
      // measured box, which the drift would throw off.
      [].forEach.call(p.sec.querySelectorAll(".stray-seed"), function (sd) {
        var cs = getComputedStyle(sd);
        var top = parseFloat(cs.top) || 0; // inside the section, which the strip is aligned to
        if (top + (parseFloat(cs.height) || 0) > p.S) return;
        var c = sd.cloneNode(true);
        c.style.top = top + "px";
        c.style.left = cs.left;
        face.appendChild(c);
        p.seeds.push(sd);
      });

      strip.appendChild(face);

      main.insertBefore(strip, p.page);
      p.strip = strip;
      p.bg = bg;
      p.face = face;
      p.page.style.setProperty("--stick", p.P + "px");
      // nav buttons land the section just below the titles already in the band
      p.sec.dataset.navTop = p.T - p.C;
      // The copies are what show; the originals stay in place (and readable
      // to screen readers) but invisible, so nothing is ever drawn twice.
      p.titles.concat(p.seeds).forEach(function (t) {
        t.style.opacity = "0";
      });
      // The copies are what you see and click. The originals stay in the page
      // — and in the tab order — but take no clicks, so a click can never land
      // on the hidden original instead of the copy you are looking at.
      (compact ? [] : p.extras).forEach(function (el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      });
    });

    root.classList.add("stack-on");
    update();
  }

  // Per scroll frame: only fades and class flips — nothing that moves.
  function update() {
    ticking = false;
    if (!enabled) return;
    var s = window.pageYOffset;
    var mb = mainEnd - s;
    var n = parts.length;

    parts.forEach(function (p, j) {
      var v = p.T - s; // where normal scrolling puts the page
      p.D = j < n - 1 ? Math.min(Math.max(v, p.P), mb - p.H) : v; // where sticky draws it
      p.top = Math.max(v, p.C); // where its strip — and so its top border — is drawn
      p.caught = v <= p.C + 0.5; // its strip has stuck in the band
    });

    // how many parts have stacked on top of each one
    var above = 0;
    for (var k = parts.length - 1; k >= 0; k--) {
      parts[k].level = above;
      if (parts[k].caught) above++;
    }

    parts.forEach(function (p, j) {
      p.face.style.opacity = 1 - Math.min(p.level * FADE_STEP, FADE_MAX);
      var next = parts[j + 1];
      // Solid from the moment it sticks. Until then it sits exactly over the
      // section's own top, in the section's own colour, so turning it solid
      // changes nothing on screen. Fading it in instead left the band
      // see-through for a moment, and the next section's top border could be
      // seen sliding through the band and across whatever it holds.
      var alpha = p.caught ? 1 : 0;
      p.bg.style.opacity = alpha;
      // it only blocks clicks once solid (what is under it is hidden by then)
      p.strip.style.pointerEvents = alpha ? "auto" : "none";
      // on a narrow screen the title shrinks into its slot as it sticks
      if (compact) p.strip.classList.toggle("is-docked", p.caught);
      // the card stacks show only down to the next part's top border, so they
      // slide under it as it rises rather than being drawn across it
      if (p.hang) {
        p.hang.style.height = Math.max(0, (next ? next.top : 1e5) - p.top) + "px";
      }
      // copies follow the originals' reveal-on-scroll, and stay shown once stuck
      p.clones.forEach(function (c, i) {
        c.classList.toggle("is-visible", p.caught || p.titles[i].classList.contains("is-visible"));
      });
    });
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  // mirror reveal changes on the originals straight away
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function () {
      update();
    });
    parts.forEach(function (p) {
      p.titles.forEach(function (t) {
        mo.observe(t, { attributes: true, attributeFilter: ["class"] });
      });
    });
  }

  var measuring = false;
  var pending = false; // a remeasure held back while the showcase is open
  function showcaseOpen() {
    return document.body.classList.contains("is-showcase-open");
  }
  function remeasure(force) {
    if (measuring) return;
    measuring = true;
    requestAnimationFrame(function () {
      measuring = false;
      // The showcase panel grows out of — and collapses back into — whatever
      // was clicked, which can be a copy living in the band. Rebuilding the
      // strips destroys that copy, leaving the panel nothing to collapse onto.
      // This is the common case, not a rare one: opening the panel hides the
      // page scrollbar, which widens main, which lands right here.
      if (showcaseOpen()) {
        pending = true;
        return;
      }
      pending = false;
      // The screen is the same width and only a little shorter or taller: that
      // is a phone's address bar sliding away mid-scroll, not a new layout.
      // Re-pin rather than rebuild, which would jump the whole stack under the
      // reader's thumb. The check lives here, not on the resize event, because
      // the address bar also reaches us through the ResizeObserver — the hero
      // is sized to the screen, so main changes height with it.
      if (
        !force &&
        enabled &&
        window.innerWidth === measuredW &&
        Math.abs(window.innerHeight - measuredH) < TOOLBAR
      ) {
        rescale();
        return;
      }
      measure();
    });
  }
  if ("MutationObserver" in window) {
    new MutationObserver(function () {
      if (pending && !showcaseOpen()) remeasure();
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  // Re-pin everything to a new screen height without rebuilding a thing.
  function rescale() {
    VH = window.innerHeight;
    parts.forEach(function (p) {
      p.P = Math.min(p.C, VH - p.H);
      p.page.style.setProperty("--stick", p.P + "px");
    });
    update();
  }
  window.addEventListener("resize", function () {
    remeasure();
  });
  // Fonts and late images really do change the layout, so these rebuild.
  window.addEventListener("load", function () {
    remeasure(true);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      remeasure(true);
    });
  }
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () {
      remeasure();
    });
    ro.observe(main); // content above the stack growing shifts every part down
    parts.forEach(function (p) {
      ro.observe(p.page);
    });
  }
  setTimeout(function () {
    remeasure(true);
  }, 400);
  setTimeout(function () {
    remeasure(true);
  }, 1200);

  measure();
})();
