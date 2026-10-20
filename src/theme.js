/* Pemilih tema untuk pembaca. Dimuat di <head> tanpa defer agar tema terpasang sebelum halaman tergambar.
   Pilihan disimpan di browser pembaca (localStorage). Warna tiap tema ada di styles.css (bagian "Tema").
   Juga mengatur data-bs-theme agar komponen Bootstrap (kolom pilihan, tombol tutup) ikut terang/gelap. */
(function () {
  var KEY = "tema-potret";
  var EN = document.documentElement.lang === "en";
  var T = [
    ["otomatis", "Otomatis", "Auto", 0], ["kertas", "Kertas", "Paper", 0], ["sepia", "Sepia", "Sepia", 0],
    ["hutan", "Hutan", "Forest", 0], ["laut", "Laut", "Sea", 0], ["senja", "Senja", "Dusk", 0],
    ["malam", "Malam", "Night", 1], ["tinta", "Tinta", "Ink", 1]
  ];
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;

  function valid(v) { return T.some(function (t) { return t[0] === v; }); }
  function get() { try { var v = localStorage.getItem(KEY); return valid(v) ? v : "otomatis"; } catch (e) { return "otomatis"; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* mode privat: tema berlaku selama halaman terbuka */ } }
  function isDark(v) {
    if (v === "otomatis") return !!(mq && mq.matches);
    return T.filter(function (t) { return t[0] === v; })[0][3] === 1;
  }
  function paint(v) {
    root.setAttribute("data-bs-theme", isDark(v) ? "dark" : "light");
    var m = document.querySelector('meta[name="theme-color"]');
    var c = getComputedStyle(root).getPropertyValue("--bone").trim();
    if (m && c) m.setAttribute("content", c);
  }
  function apply(v) {
    if (v === "otomatis") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", v);
    paint(v);
  }
  apply(get());
  if (mq && mq.addEventListener) mq.addEventListener("change", function () { if (get() === "otomatis") paint("otomatis"); });

  function build() {
    paint(get());
    var host = document.querySelector(".site-navbar .navbar-nav");
    if (!host) return;
    var cur = get();
    var label = EN ? "Theme" : "Tema";

    var li = document.createElement("li"); li.className = "nav-item";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "nav-link tema-btn"; btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<i class="bi bi-palette me-2" aria-hidden="true"></i>' + label;
    li.appendChild(btn); host.appendChild(li);

    var panel = document.createElement("div");
    panel.className = "tema-panel"; panel.hidden = true; panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", EN ? "Choose theme" : "Pilih tema");
    var items = T.map(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.dataset.t = t[0]; b.setAttribute("aria-pressed", String(t[0] === cur));
      var sw = document.createElement("span"); sw.className = "sw"; sw.dataset.t = t[0]; sw.setAttribute("aria-hidden", "true");
      sw.appendChild(document.createElement("i"));
      b.appendChild(sw); b.appendChild(document.createTextNode(EN ? t[2] : t[1]));
      b.onclick = function () {
        cur = t[0]; save(cur); apply(cur);
        items.forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === cur)); });
      };
      panel.appendChild(b);
      return b;
    });
    document.body.appendChild(panel);

    function open() {
      panel.style.top = Math.round(btn.getBoundingClientRect().bottom + 8) + "px";
      panel.hidden = false; btn.setAttribute("aria-expanded", "true");
    }
    function close(focus) {
      if (panel.hidden) return;
      panel.hidden = true; btn.setAttribute("aria-expanded", "false");
      if (focus) btn.focus();
    }
    btn.onclick = function () { panel.hidden ? open() : close(); };
    document.addEventListener("click", function (e) { if (!panel.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(true); });
    window.addEventListener("resize", function () { close(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
