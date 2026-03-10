(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Resume + email buttons
  const resumeBtn = document.getElementById("resumeBtn");
  resumeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Replace the resume link: set href to your PDF URL.");
  });

  const emailBtn = document.getElementById("emailBtn");
  emailBtn?.addEventListener("click", () => {
    window.location.href = "mailto:you@example.com";
  });

  // Smooth scroll for internal links (faster + consistent)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Reveal on scroll
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          ent.target.classList.add("in");
          io.unobserve(ent.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  // Scroll progress + section label
  const fill = document.getElementById("scrollFill");
  const label = document.getElementById("scrollLabel");
  const sections = Array.from(document.querySelectorAll("[data-section]"));

  function onScroll() {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = docH <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / docH));
    if (fill) fill.style.height = `${p * 100}%`;

    // Find closest section (based on top distance)
    let best = sections[0];
    let bestDist = Infinity;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const dist = Math.abs(r.top - 120);
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    if (label && best) label.textContent = best.getAttribute("data-section") || "—";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Magnetic buttons (subtle)
  const magnets = document.querySelectorAll(".magnetic");
  magnets.forEach((btn) => {
    let rect = null;
    btn.addEventListener("mouseenter", () => (rect = btn.getBoundingClientRect()));
    btn.addEventListener("mousemove", (e) => {
      if (!rect) rect = btn.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      btn.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0px, 0px)";
      rect = null;
    });
  });

  // Tilt cards (projects)
  const tilts = document.querySelectorAll("[data-tilt]");
  tilts.forEach((card) => {
    let rect = null;

    card.addEventListener("mouseenter", () => {
      rect = card.getBoundingClientRect();
    });

    card.addEventListener("mousemove", (e) => {
      if (!rect) rect = card.getBoundingClientRect();

      const px = (e.clientX - rect.left) / rect.width;  // 0..1
      const py = (e.clientY - rect.top) / rect.height;  // 0..1

      const rx = (py - 0.5) * -10; // tilt x
      const ry = (px - 0.5) * 12;  // tilt y

      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      rect = null;
    });
  });

  // "Let’s Work" button scrolls to contact
  const hireBtn = document.getElementById("hireBtn");
  hireBtn?.addEventListener("click", () => {
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  });
})();