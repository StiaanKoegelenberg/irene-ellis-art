// Get In Touch — the message form, emailed to Irene.
//
// A visitor fills in their name, email and message and presses Submit; the
// message goes to Web3Forms, a free form service, which emails it to Irene.
// Her email address isn't in this code at all: it is tied to the key in
// config.js (window.WEB3FORMS_KEY). The visitor's email address becomes the
// "reply-to", so Irene can simply press Reply.
//
// Nothing is stored on the website or in the database.
(function () {
  var KEY = window.WEB3FORMS_KEY;
  var ENDPOINT = "https://api.web3forms.com/submit";

  var form = document.querySelector("#contact .contact__box--message");
  if (!form) return;
  var btn = form.querySelector(".contact__submit");
  var statusEl = form.querySelector(".contact__status");
  var field = function (name) {
    return form.querySelector('[name="' + name + '"]');
  };
  var value = function (name) {
    var el = field(name);
    return el && el.value ? el.value.trim() : "";
  };

  function say(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "contact__status" + (kind ? " contact__status--" + kind : "");
  }

  // A real submit button, so pressing Enter in a field sends too. The page
  // must not reload (that would lose what was typed), so it's stopped here.
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = (value("name") + " " + value("surname")).trim();
    var email = value("email");
    var message = value("message");

    if (!value("name")) {
      say("Please add your name.", "error");
      field("name").focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say("Please check your email address.", "error");
      field("email").focus();
      return;
    }
    if (!message) {
      say("Please write a message.", "error");
      field("message").focus();
      return;
    }
    if (!KEY) {
      say("Messages aren’t connected yet. Please reach Irene on Facebook or Instagram for now.", "error");
      return;
    }

    // Plain form data (not JSON): the browser can send it to another site
    // without an extra permission check first.
    var data = new FormData();
    data.append("access_key", KEY);
    data.append("subject", "New message from the website: " + name);
    data.append("from_name", "Irene Ellis Art website");
    data.append("name", name);
    data.append("email", email); // becomes the reply-to address
    data.append("message", message);
    data.append("botcheck", field("botcheck").checked ? "true" : "");

    btn.disabled = true;
    say("Sending…");
    fetch(ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: data })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        });
      })
      .then(function (reply) {
        if (!reply.success) throw new Error(reply.message || "not sent");
        say("Thank you, your message is on its way to Irene.", "ok");
        ["name", "surname", "email", "message"].forEach(function (n) {
          field(n).value = "";
        });
      })
      .catch(function () {
        // Never show the service's own error to a visitor; it means nothing
        // to them. Point them at another way to reach Irene instead.
        say("Sorry, that didn’t go through. Please try again, or reach Irene on Facebook or Instagram.", "error");
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
})();
