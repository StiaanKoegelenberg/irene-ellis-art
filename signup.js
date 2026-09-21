// Workshop sign-ups — the form inside the dark panel, wired to the database.
//
// A visitor picks a workshop date, fills in their details and presses Submit;
// the sign-up lands in the `signups` table, where the admin page reads it.
// Only inserting is allowed from here: the database's row rules let anyone add
// a sign-up but let nobody read the list back without signing in, so one
// visitor can never see another's name or phone number.
(function () {
  var URL_BASE = window.SUPABASE_URL;
  var KEY = window.SUPABASE_ANON_KEY;

  var form = document.querySelector(".signup");
  var btn = document.querySelector(".signup__submit");
  if (!form || !btn) return;

  var statusEl = form.querySelector(".signup__status");
  var fields = {
    name: form.querySelector('input[type="text"]'),
    surname: form.querySelectorAll('input[type="text"]')[1],
    phone: form.querySelector('input[type="tel"]'),
    attendees: form.querySelector('input[type="number"]'),
  };

  // Which date was clicked. The panel is opened by a workshop button, and the
  // page stack copies those buttons into its title band, so this listens on the
  // document rather than on the buttons themselves — a copy works like the
  // original. Read from the button's own text, which is what the visitor saw.
  var picked = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('[data-category-open][data-category="workshop"]');
    if (!b) return;
    var month = b.closest(".workshops__month");
    var text = function (sel) {
      var el = b.querySelector(sel);
      return el ? el.textContent.trim() : "";
    };
    picked = {
      workshop_month: month ? (month.querySelector(".workshops__month-name") || {}).textContent.trim() : "",
      workshop_date: [text(".workshop__day"), text(".workshop__weekday"), text(".workshop__time")]
        .filter(Boolean)
        .join(" "),
      workshop_topic: text(".workshop__topic"),
    };
    say("");
  });

  function say(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "signup__status" + (kind ? " signup__status--" + kind : "");
  }

  function value(el) {
    return el && el.value ? el.value.trim() : "";
  }

  btn.addEventListener("click", function () {
    if (!URL_BASE || !KEY) {
      say("Sign-ups aren’t connected yet.", "error");
      return;
    }
    var row = {
      name: value(fields.name),
      surname: value(fields.surname),
      phone: value(fields.phone),
      attendees: Number(value(fields.attendees)) || 1,
      workshop_month: (picked && picked.workshop_month) || "",
      workshop_date: (picked && picked.workshop_date) || "",
      workshop_topic: (picked && picked.workshop_topic) || "",
    };

    if (!row.name || !row.surname) {
      say("Please fill in your name and surname.", "error");
      return;
    }
    if (row.phone.replace(/\D/g, "").length < 9) {
      say("Please check the cellphone number.", "error");
      return;
    }

    btn.disabled = true;
    say("Sending…");
    fetch(URL_BASE + "/rest/v1/signups", {
      method: "POST",
      headers: {
        apikey: KEY,
        "Content-Type": "application/json",
        // Ask for nothing back. The row rules deliberately forbid reading the
        // list, and PostgREST returns the new row by default — which would be
        // refused, and would look like the sign-up had failed when it hadn't.
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(t || "Error " + res.status);
          });
        }
        say("Thank you — your place is booked. Irene will be in touch.", "ok");
        [fields.name, fields.surname, fields.phone, fields.attendees].forEach(function (el) {
          if (el) el.value = "";
        });
      })
      .catch(function () {
        // Never show the raw database error to a visitor — it means nothing to
        // them and can leak the shape of the table.
        say("Sorry, that didn’t go through. Please try again or phone Irene.", "error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
})();
