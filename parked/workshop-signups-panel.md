# Parked: the Workshop sign-ups panel

The admin panel that listed every sign-up in a table — name, phone, how many
people, which workshop, when they signed up — with heads-per-month totals
above it and a Refresh button.

Removed on request, kept here in one piece in case it is wanted again.

**Note:** the sign-up DATA is still loaded — the Workshop participants panel
shows the same names inside each date button. Only this table view went away.
This code fetched the rows and shared them; that fetch now lives in the
participants panel instead. If you restore this block, delete the fetch from
one of the two so the list is not requested twice.

## To put it back

1. HTML → , just before the PORTFOLIO section.
2. JavaScript → , before the Workshop participants block.
3. CSS → , anywhere.

---

## 1. HTML

```html
      <!-- ================= WORKSHOP SIGN-UPS ================= -->
      <section class="panel">
        <div class="panel__head">
          <h2>Workshop sign-ups</h2>
          <button type="button" class="btn" data-signups-refresh>Refresh</button>
        </div>
        <p class="hint">
          Everyone who has signed up through the website, newest first. Only you
          can see this — it holds people's names and phone numbers, so keep it to
          yourself and don't paste it anywhere public.
        </p>
        <p class="signups__status" data-signups-status></p>
        <div data-signups></div>
      </section>
```

## 2. JavaScript

```js
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
  // One fetch serves two panels: this list, and the per-date participants roll
  // below it. The rows are handed over rather than fetched twice.
  function publish(rows) {
    window.IEA_SIGNUPS = rows;
    document.dispatchEvent(new CustomEvent("signups:loaded"));
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
        publish(rows || []);
      })
      .catch(function (err) {
        var msg = String(err.message || err);
        // Worth naming plainly: the table hasn't been created in Supabase yet.
        if (msg.indexOf("PGRST205") >= 0 || msg.indexOf("does not exist") >= 0) {
          setStatus("The sign-ups table doesn’t exist in Supabase yet.", true);
        } else {
          setStatus("Couldn’t load sign-ups: " + msg, true);
        }
        publish([]); // still draw the months, with zero counts
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
```

## 3. CSS

```css
/* --- Workshop sign-ups ---------------------------------------------------
   A plain, readable table: this is a working list Irene reads down, not a
   thing to decorate. Heads-per-month sit above it, since that is the number
   the participants panel asks her to keep. */
.signups__status {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: var(--muted, #b9aea6);
}
.signups__totals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-bottom: 16px;
}
.signups__total {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 0.95rem;
}
.signups__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.signups__table th,
.signups__table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--line);
}
.signups__table th {
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 0.78rem;
  opacity: 0.75;
}
.signups__topic {
  opacity: 0.65;
  font-size: 0.86rem;
}
@media (max-width: 820px) {
  /* A phone can't show five columns, so each sign-up becomes a stacked card
     with its column name in front of the value. */
  .signups__table,
  .signups__table tbody,
  .signups__table tr,
  .signups__table td {
    display: block;
    width: 100%;
  }
  .signups__table thead {
    display: none;
  }
  .signups__table tr {
    margin-bottom: 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 6px 4px;
  }
  .signups__table td {
    border: none;
    padding: 6px 12px;
  }
  .signups__table td::before {
    content: attr(data-label) " ";
    opacity: 0.6;
    font-size: 0.8rem;
  }
}
```
