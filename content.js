// Workshop dates, from the database.
//
// The dates written into index.html are the FALLBACK, not the source. On load
// this asks the database what Irene last saved in /admin and, if there is
// anything there, redraws the months from it. If the request fails, the
// database is asleep, or nothing has been saved yet, the page keeps the dates
// it was built with — a visitor never sees an empty section because a server
// was slow.
//
// Reading is deliberately public: these are the dates the website exists to
// show. Only writing needs her login.
(function () {
  var URL_BASE = window.SUPABASE_URL;
  var KEY = window.SUPABASE_ANON_KEY;
  // Inside the SECTION, deliberately. The page stack copies this grid into its
  // title band and inserts that copy earlier in the document, so a plain
  // document-wide query finds the copy — and writing there is pointless: the
  // stack rebuilds its copies from the real one and the change vanishes.
  var section = document.getElementById("workshop-dates");
  var grid = section && section.querySelector(".workshops__grid");
  if (!grid || !URL_BASE || !KEY) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // One date, in the same shape the hand-written markup uses — the sign-up
  // panel, the page stack and the styles all key off these exact classes.
  function dateButton(d) {
    var day = esc(d.date);
    var weekday = esc(d.day);
    var time = esc(d.time);
    var topic = String(d.topic || "").trim();
    if (!day && !weekday && !time) return "";
    return (
      '<button type="button" class="workshop" data-category-open data-category="workshop">' +
      '<span class="workshop__main">' +
      '<span class="workshop__day">' + day + "</span> " +
      '<span class="workshop__weekday">' + weekday + "</span> " +
      '<span class="workshop__time">' + time + "</span>" +
      "</span>" +
      // an empty topic would draw an empty pill, so it is left out entirely
      (topic ? '<span class="workshop__topic">' + esc(topic) + "</span>" : "") +
      "</button>"
    );
  }

  function render(months) {
    var html = months
      .map(function (m) {
        var dates = (m.dates || []).map(dateButton).join("");
        if (!dates && !String(m.name || "").trim()) return "";
        return (
          '<div class="workshops__month reveal">' +
          '<p class="workshops__month-name">' + esc(m.name) + "</p>" +
          '<div class="workshops__dates">' + dates + "</div>" +
          "</div>"
        );
      })
      .join("");
    if (!html) return false; // nothing worth showing: keep the built-in dates
    grid.innerHTML = html;

    // Hand the new months to the reveal observer, or they stay invisible.
    var reveal = window.IEA_REVEAL;
    grid.querySelectorAll(".reveal").forEach(function (el) {
      if (reveal) reveal.observe(el);
      else el.classList.add("is-visible");
    });
    // The page stack copies this grid into its title band and measures the
    // section's height off it, so tell it to look again.
    document.dispatchEvent(new CustomEvent("content:updated"));
    return true;
  }

  fetch(URL_BASE + "/rest/v1/site_content?id=eq.main&select=data", {
    headers: { apikey: KEY },
  })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (rows) {
      var data = rows && rows[0] && rows[0].data;
      var months = data && Array.isArray(data.months) ? data.months : null;
      if (months && months.length) render(months);
    })
    .catch(function () {
      /* keep the dates the page was built with */
    });
})();
