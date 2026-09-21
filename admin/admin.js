// --- Admin login (Supabase auth via its REST endpoint — no library) ---
// Shows the login screen until you sign in; the editor stays hidden until then.
// A successful sign-in stores the session token so a refresh keeps you in.
(function () {
  var URL = window.SUPABASE_URL;
  var KEY = window.SUPABASE_ANON_KEY;
  var STORE = "iea_admin_session";

  var loginView = document.querySelector('[data-view="login"]');
  var editorView = document.querySelector('[data-view="editor"]');
  var form = document.querySelector("[data-login-form]");
  var emailEl = document.querySelector("[data-email]");
  var passEl = document.querySelector("[data-password]");
  var btn = document.querySelector("[data-login-btn]");
  var errEl = document.querySelector("[data-login-error]");
  var logoutBtn = document.querySelector("[data-logout]");

  function show(view) {
    if (loginView) loginView.hidden = view !== "login";
    if (editorView) editorView.hidden = view !== "editor";
  }
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORE));
    } catch (e) {
      return null;
    }
  }
  function sessionValid() {
    var s = getSession();
    return !!(s && s.expires_at && s.expires_at * 1000 > Date.now());
  }
  function configured() {
    return (
      URL &&
      KEY &&
      URL.indexOf("YOUR-PROJECT") === -1 &&
      KEY.indexOf("YOUR-ANON") === -1
    );
  }
  function fail(msg) {
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errEl) errEl.hidden = true;
      if (!configured()) {
        fail("Supabase isn’t set up yet — add your URL and anon key to config.js.");
        return;
      }
      if (btn) btn.disabled = true;
      fetch(URL + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailEl.value, password: passEl.value }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok)
              throw new Error(
                data.error_description || data.msg || data.message || "Sign in failed."
              );
            return data;
          });
        })
        .then(function (data) {
          localStorage.setItem(
            STORE,
            JSON.stringify({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: data.expires_at,
            })
          );
          show("editor");
        })
        .catch(function (err) {
          fail(err.message || "Sign in failed.");
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem(STORE);
      show("login");
    });
  }

  // show/hide password (the eye icon on the right of the password field)
  var pwToggle = document.querySelector("[data-pw-toggle]");
  if (pwToggle && passEl) {
    var eyeShow = pwToggle.querySelector(".pw-icon--show");
    var eyeHide = pwToggle.querySelector(".pw-icon--hide");
    pwToggle.addEventListener("click", function () {
      var reveal = passEl.type === "password";
      passEl.type = reveal ? "text" : "password";
      pwToggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      // toggleAttribute works on SVG elements; the .hidden property does not
      if (eyeShow) eyeShow.toggleAttribute("hidden", reveal);
      if (eyeHide) eyeHide.toggleAttribute("hidden", !reveal);
    });
  }

  show(sessionValid() ? "editor" : "login");
})();

// Admin page interactions — enough to make the layout usable to build on.
// NOTE: nothing is saved/persisted yet. Uploads only preview locally; adding
// the real "Save" (backend / build step / localStorage) is the next step.
(function () {
  var WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  var months = document.getElementById("months");
  var dateTpl = document.getElementById("date-tpl");
  var monthTpl = document.getElementById("month-tpl");

  // Fill a <select class="weekday"> with the weekday options and pick the one
  // named in its data-day attribute (if any).
  function fillWeekday(select) {
    if (select.dataset.filled) return;
    var chosen = select.getAttribute("data-day") || "";
    WEEKDAYS.forEach(function (day) {
      var opt = document.createElement("option");
      opt.value = day;
      opt.textContent = day;
      if (day === chosen) opt.selected = true;
      select.appendChild(opt);
    });
    select.dataset.filled = "1";
  }

  function fillAllWeekdays(scope) {
    (scope || document).querySelectorAll(".weekday").forEach(fillWeekday);
  }

  fillAllWeekdays();

  // --- Add / remove months and dates (event delegation) ---
  document.addEventListener("click", function (e) {
    var addDate = e.target.closest("[data-add-date]");
    if (addDate) {
      var month = addDate.closest(".month");
      var row = dateTpl.content.firstElementChild.cloneNode(true);
      fillAllWeekdays(row);
      month.querySelector(".dates").appendChild(row);
      return;
    }

    var removeDate = e.target.closest("[data-remove-date]");
    if (removeDate) {
      removeDate.closest(".date-row").remove();
      return;
    }

    var removeMonth = e.target.closest("[data-remove-month]");
    if (removeMonth) {
      removeMonth.closest(".month").remove();
      return;
    }
  });

  var addMonthBtn = document.querySelector("[data-add-month]");
  if (addMonthBtn) {
    addMonthBtn.addEventListener("click", function () {
      var month = monthTpl.content.firstElementChild.cloneNode(true);
      fillAllWeekdays(month);
      months.appendChild(month);
    });
  }

  // Clicking anywhere on a time field opens its picker (not just the clock
  // icon), so it behaves like the weekday dropdown. Delegated, so it also
  // covers dates added later. showPicker() needs a user gesture — a click is.
  document.addEventListener("click", function (e) {
    var timeInput = e.target.closest('input[type="time"]');
    if (timeInput && typeof timeInput.showPicker === "function") {
      try {
        timeInput.showPicker();
      } catch (err) {
        /* ignore — e.g. picker already open or not allowed */
      }
    }
  });

  // --- Portfolio uploads (local preview only) ---
  function addThumb(grid, file) {
    var url = URL.createObjectURL(file);
    var thumb = document.createElement("div");
    thumb.className = "thumb";

    var img = document.createElement("img");
    img.src = url;
    img.alt = file.name;

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "thumb__remove";
    remove.setAttribute("aria-label", "Remove image");
    remove.textContent = "×";
    remove.addEventListener("click", function () {
      URL.revokeObjectURL(url);
      thumb.remove();
    });

    thumb.appendChild(img);
    thumb.appendChild(remove);
    grid.appendChild(thumb);
  }

  function handleFiles(album, files) {
    var grid = album.querySelector("[data-grid]");
    Array.prototype.forEach.call(files, function (file) {
      if (file.type.indexOf("image/") === 0) addThumb(grid, file);
    });
  }

  document.querySelectorAll(".album").forEach(function (album) {
    var input = album.querySelector("[data-upload]");
    var zone = album.querySelector(".dropzone");

    input.addEventListener("change", function () {
      handleFiles(album, input.files);
      input.value = ""; // allow re-picking the same file
    });

    // drag & drop onto the zone
    ["dragenter", "dragover"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.add("is-drag");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.remove("is-drag");
      });
    });
    zone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(album, e.dataTransfer.files);
      }
    });
  });

  // --- Content storage (Supabase) ------------------------------------------
  // Load saved content into the editor on start, and save the workshop months
  // + participant counts back to the database on demand. Reading is public
  // (anyone can see the dates); writing needs the signed-in admin's token, so
  // only you can change it (enforced by the row-level rules on the table).
  (function () {
    var SB_URL = window.SUPABASE_URL; // NOT `URL` — that's the global used above
    var SB_KEY = window.SUPABASE_ANON_KEY;
    var ROW = SB_URL + "/rest/v1/site_content?id=eq.main";
    var saveBtn = document.querySelector("[data-save]");
    var statusEl = document.querySelector("[data-save-status]");

    function token() {
      try {
        return (JSON.parse(localStorage.getItem("iea_admin_session")) || {}).access_token;
      } catch (e) {
        return null;
      }
    }
    function configured() {
      return SB_URL && SB_KEY && SB_URL.indexOf("YOUR-PROJECT") === -1;
    }
    function setStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.style.color = isError ? "var(--accent)" : "";
    }

    // Read the whole editor into one plain object (the JSON "bundle").
    function collect() {
      var monthsData = [];
      document.querySelectorAll("#months .month").forEach(function (m) {
        var nameEl = m.querySelector(".month__top input");
        var dates = [];
        m.querySelectorAll(".date-row").forEach(function (row) {
          dates.push({
            date: (row.querySelector('input[type="number"]') || {}).value || "",
            day: (row.querySelector("select.weekday") || {}).value || "",
            time: (row.querySelector('input[type="time"]') || {}).value || "",
            topic: (row.querySelector(".date-topic") || {}).value || "",
          });
        });
        monthsData.push({ name: nameEl ? nameEl.value.trim() : "", dates: dates });
      });
      var participants = {};
      document.querySelectorAll(".participant").forEach(function (p) {
        var name = p.querySelector(".participant__month").textContent.trim();
        participants[name] = Number(p.querySelector(".participant__count").value) || 0;
      });
      return { months: monthsData, participants: participants };
    }

    // Rebuild the editor from a saved bundle (reusing the month/date templates).
    function apply(data) {
      if (data && Array.isArray(data.months)) {
        months.innerHTML = "";
        data.months.forEach(function (m) {
          var el = monthTpl.content.firstElementChild.cloneNode(true);
          var nameEl = el.querySelector(".month__top input");
          if (nameEl) nameEl.value = m.name || "";
          var wrap = el.querySelector(".dates");
          wrap.innerHTML = "";
          (m.dates || []).forEach(function (d) {
            var row = dateTpl.content.firstElementChild.cloneNode(true);
            var n = row.querySelector('input[type="number"]');
            var sel = row.querySelector("select.weekday");
            var tm = row.querySelector('input[type="time"]');
            var tp = row.querySelector(".date-topic");
            if (n) n.value = d.date || "";
            if (sel) sel.setAttribute("data-day", d.day || "");
            if (tm) tm.value = d.time || "";
            if (tp) tp.value = d.topic || "";
            wrap.appendChild(row);
          });
          months.appendChild(el);
        });
        fillAllWeekdays(months);
      }
      if (data && data.participants) {
        document.querySelectorAll(".participant").forEach(function (p) {
          var name = p.querySelector(".participant__month").textContent.trim();
          var input = p.querySelector(".participant__count");
          if (name in data.participants) input.value = data.participants[name];
        });
      }
    }

    // Load saved content on start (public read — no sign-in needed to see it).
    // If nothing is saved yet, the built-in defaults stay as the starting point.
    if (configured()) {
      fetch(ROW + "&select=data", { headers: { apikey: SB_KEY } })
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .then(function (rows) {
          var data = rows && rows[0] && rows[0].data;
          if (data && Object.keys(data).length) apply(data);
        })
        .catch(function () {
          /* keep the built-in defaults if the load fails */
        });
    }

    // Save: write the bundle back. Needs the admin's token so the row rules
    // allow the change (anyone reading is fine; only you may write).
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        if (!configured()) {
          setStatus("Supabase isn’t set up in config.js.", true);
          return;
        }
        var tok = token();
        if (!tok) {
          setStatus("Your session expired — please sign in again.", true);
          return;
        }
        saveBtn.disabled = true;
        setStatus("Saving…");
        fetch(ROW, {
          method: "PATCH",
          headers: {
            apikey: SB_KEY,
            Authorization: "Bearer " + tok,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ data: collect(), updated_at: new Date().toISOString() }),
        })
          .then(function (r) {
            if (!r.ok)
              return r.text().then(function (t) {
                throw new Error(t || "Error " + r.status);
              });
            setStatus("Saved ✓ — your changes are stored.");
          })
          .catch(function (err) {
            setStatus("Couldn’t save: " + (err.message || err), true);
          })
          .finally(function () {
            saveBtn.disabled = false;
          });
      });
    }
  })();
})();

// --- Workshop sign-ups (Supabase) -----------------------------------------
// The list of people who signed up on the website. The row rules let ANYONE
// add a sign-up but only a signed-in admin read them back, so this needs the
// session token — the publishable key on its own returns nothing.
(function () {
  var SB_URL = window.SUPABASE_URL;
  var SB_KEY = window.SUPABASE_ANON_KEY;
  var list = document.querySelector("[data-signups]");
  var statusEl = document.querySelector("[data-signups-status]");
  var refreshBtn = document.querySelector("[data-signups-refresh]");
  var editorView = document.querySelector('[data-view="editor"]');
  if (!list) return;

  function token() {
    try {
      return (JSON.parse(localStorage.getItem("iea_admin_session")) || {}).access_token;
    } catch (e) {
      return null;
    }
  }
  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "var(--accent)" : "";
  }
  // Names and phone numbers are typed by strangers — never let that text be
  // treated as markup when it is put back on the page.
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function when(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return "";
    return (
      d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
      ", " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  }

  function render(rows) {
    if (!rows.length) {
      list.innerHTML = '<p class="hint">No sign-ups yet.</p>';
      return;
    }
    // Heads per month — the count the participants panel asks you to keep.
    var totals = {};
    rows.forEach(function (r) {
      var m = r.workshop_month || "Not specified";
      totals[m] = (totals[m] || 0) + (Number(r.attendees) || 1);
    });
    var summary = Object.keys(totals)
      .map(function (m) {
        return (
          '<span class="signups__total"><strong>' + esc(m) + "</strong> · " + totals[m] + " people</span>"
        );
      })
      .join("");
    var body = rows
      .map(function (r) {
        var workshop = [r.workshop_month, r.workshop_date].filter(Boolean).join(" · ");
        return (
          '<tr><td data-label="Name">' +
          esc(((r.name || "") + " " + (r.surname || "")).trim()) +
          '</td><td data-label="Phone">' +
          esc(r.phone) +
          '</td><td data-label="People">' +
          (Number(r.attendees) || 1) +
          '</td><td data-label="Workshop">' +
          esc(workshop) +
          (r.workshop_topic ? '<br><span class="signups__topic">' + esc(r.workshop_topic) + "</span>" : "") +
          '</td><td data-label="Signed up">' +
          esc(when(r.created_at)) +
          "</td></tr>"
        );
      })
      .join("");
    list.innerHTML =
      '<div class="signups__totals">' +
      summary +
      "</div>" +
      '<table class="signups__table"><thead><tr>' +
      "<th>Name</th><th>Phone</th><th>People</th><th>Workshop</th><th>Signed up</th>" +
      "</tr></thead><tbody>" +
      body +
      "</tbody></table>";
  }

  var loading = false;
  function load() {
    if (loading) return;
    if (!SB_URL || !SB_KEY) {
      setStatus("Supabase isn’t set up in config.js.", true);
      return;
    }
    var tok = token();
    if (!tok) {
      setStatus("Sign in to see the sign-ups.", true);
      return;
    }
    loading = true;
    setStatus("Loading…");
    fetch(SB_URL + "/rest/v1/signups?select=*&order=created_at.desc", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + tok },
    })
      .then(function (r) {
        if (!r.ok)
          return r.text().then(function (t) {
            throw new Error(t || "Error " + r.status);
          });
        return r.json();
      })
      .then(function (rows) {
        setStatus("");
        render(rows || []);
      })
      .catch(function (err) {
        var msg = String(err.message || err);
        // Worth naming plainly: the table hasn't been created in Supabase yet.
        if (msg.indexOf("PGRST205") >= 0 || msg.indexOf("does not exist") >= 0) {
          setStatus("The sign-ups table doesn’t exist in Supabase yet.", true);
        } else {
          setStatus("Couldn’t load sign-ups: " + msg, true);
        }
      })
      .finally(function () {
        loading = false;
      });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", load);
  // Signing in only unhides the editor — the page never reloads — so load the
  // list the moment it appears rather than only on first script run.
  if (editorView && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (!editorView.hidden) load();
    }).observe(editorView, { attributes: true, attributeFilter: ["hidden"] });
  }
  if (editorView && !editorView.hidden) load();
})();
