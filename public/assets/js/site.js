(() => {
  // 1. Mobile navigation drawer & submenu
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeMenuBtn = document.querySelector(".mobile-nav-toggle");
  const parksCaret = document.querySelector(".mobile-nav .icon-caret");
  const mobileParks = document.getElementById("mobile-parks");

  function setMenuOpen(open) {
    if (!mobileMenu || !hamburger) return;
    mobileMenu.hidden = !open;
    hamburger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isExpanded);
    });
  }

  if (closeMenuBtn) {
    closeMenuBtn.addEventListener("click", () => setMenuOpen(false));
  }

  if (parksCaret && mobileParks) {
    parksCaret.addEventListener("click", () => {
      const expanded = parksCaret.getAttribute("aria-expanded") === "true";
      parksCaret.setAttribute("aria-expanded", String(!expanded));
      mobileParks.hidden = expanded;
    });
  }

  // Close dialogs on [data-close-dialog] click or backdrop click
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  document.querySelectorAll("[data-close-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = btn.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  // 2. Photo Viewer Lightbox
  const photoDialog = document.getElementById("photo-viewer");
  if (photoDialog) {
    const fullImg = photoDialog.querySelector(".photo-full");
    const prevBtn = photoDialog.querySelector(".photo-previous");
    const nextBtn = photoDialog.querySelector(".photo-next");
    const thumbsContainer = photoDialog.querySelector(".photo-thumbs");
    const statusEl = photoDialog.querySelector(".photo-status");

    let activeGroup = [];
    let activeIndex = 0;

    function renderLightbox() {
      const item = activeGroup[activeIndex];
      if (!item || !fullImg) return;
      fullImg.src = item.href;
      fullImg.alt = item.alt;
      if (statusEl) {
        statusEl.textContent = `Photo ${activeIndex + 1} of ${activeGroup.length}: ${item.alt}`;
      }
      const multiple = activeGroup.length > 1;
      if (prevBtn) prevBtn.hidden = !multiple;
      if (nextBtn) nextBtn.hidden = !multiple;
      if (thumbsContainer) {
        thumbsContainer.hidden = !multiple;
        thumbsContainer.querySelectorAll(".photo-thumb-btn").forEach((b, idx) => {
          b.setAttribute("aria-current", String(idx === activeIndex));
        });
      }
    }

    function openGroup(group, index) {
      activeGroup = group;
      activeIndex = index;
      if (thumbsContainer) {
        thumbsContainer.innerHTML = "";
        if (group.length > 1) {
          group.forEach((entry, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "photo-thumb-btn";
            btn.setAttribute("aria-label", `View photo ${idx + 1}`);
            const tImg = document.createElement("img");
            tImg.src = entry.thumb;
            tImg.alt = "";
            btn.appendChild(tImg);
            btn.addEventListener("click", () => {
              activeIndex = idx;
              renderLightbox();
            });
            thumbsContainer.appendChild(btn);
          });
        }
      }
      renderLightbox();
      if (typeof photoDialog.showModal === "function") {
        photoDialog.showModal();
      }
    }

    document.querySelectorAll("a[data-lightbox]").forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        const groupKey = anchor.getAttribute("data-lightbox") || "single";
        const anchors =
          groupKey === "single"
            ? [anchor]
            : Array.from(document.querySelectorAll(`a[data-lightbox="${groupKey}"]`));
        const group = anchors.map((a) => {
          const img = a.querySelector("img");
          return {
            href: a.getAttribute("href") || (img ? img.src : ""),
            thumb: img ? img.getAttribute("src") || img.src : a.getAttribute("href") || "",
            alt: (img && img.alt) || a.getAttribute("aria-label") || "Safari photo",
          };
        });
        const idx = Math.max(0, anchors.indexOf(anchor));
        openGroup(group, idx);
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (!activeGroup.length) return;
        activeIndex = (activeIndex - 1 + activeGroup.length) % activeGroup.length;
        renderLightbox();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (!activeGroup.length) return;
        activeIndex = (activeIndex + 1) % activeGroup.length;
        renderLightbox();
      });
    }

    photoDialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" && prevBtn && !prevBtn.hidden) prevBtn.click();
      if (e.key === "ArrowRight" && nextBtn && !nextBtn.hidden) nextBtn.click();
    });
  }

  // 3. Review Carousels & Review Detail Modal
  const reviewDialog = document.getElementById("review-detail");
  document.querySelectorAll("[data-reviews]").forEach((widget) => {
    const track = widget.querySelector(".review-track");
    const cards = Array.from(widget.querySelectorAll(".review-card"));
    const prev = widget.querySelector(".review-prev");
    const next = widget.querySelector(".review-next");
    const dotsWrap = widget.querySelector(".review-dots");
    const platform =
      (widget.querySelector(".reviews-brand") &&
        widget.querySelector(".reviews-brand").textContent) ||
      "Guest Review";

    function scrollToCard(idx) {
      const target = cards[idx];
      if (!track || !target) return;
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: "smooth" });
      if (dotsWrap) {
        dotsWrap.querySelectorAll(".review-dot").forEach((d, i) => {
          d.setAttribute("aria-current", String(i === idx));
        });
      }
    }

    let currentSlide = 0;
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      cards.forEach((_, idx) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "review-dot";
        dot.setAttribute("aria-label", `Go to review ${idx + 1}`);
        dot.setAttribute("aria-current", String(idx === 0));
        dot.addEventListener("click", () => {
          currentSlide = idx;
          scrollToCard(idx);
        });
        dotsWrap.appendChild(dot);
      });
    }

    if (prev) {
      prev.addEventListener("click", () => {
        currentSlide = (currentSlide - 1 + cards.length) % cards.length;
        scrollToCard(currentSlide);
      });
    }

    if (next) {
      next.addEventListener("click", () => {
        currentSlide = (currentSlide + 1) % cards.length;
        scrollToCard(currentSlide);
      });
    }

    cards.forEach((card) => {
      const readBtn = card.querySelector(".review-read");
      if (!readBtn || !reviewDialog) return;
      readBtn.addEventListener("click", () => {
        const authorLink = card.querySelector(".review-author a");
        const titleEl = card.querySelector(".review-title");
        const summaryEl = card.querySelector(".review-summary");
        const platformEl = reviewDialog.querySelector(".review-detail-platform");
        const modalTitle = document.getElementById("review-detail-title");
        const modalText = reviewDialog.querySelector(".review-detail-text");
        const modalLink = reviewDialog.querySelector(".review-detail-link");

        if (platformEl) platformEl.textContent = `${platform} Review`;
        if (modalTitle) {
          modalTitle.textContent =
            (titleEl && titleEl.textContent) ||
            (authorLink && authorLink.textContent) ||
            "Guest Review";
        }
        if (modalText && summaryEl) modalText.textContent = summaryEl.textContent;
        if (modalLink && authorLink) modalLink.href = authorLink.href;
        if (typeof reviewDialog.showModal === "function") {
          reviewDialog.showModal();
        }
      });
    });
  });

  // 4. Contact Safari Enquiry Form
  const enquiryForm = document.getElementById("safari-enquiry");
  const enquiryDialog = document.getElementById("enquiry-preview");
  if (enquiryForm && enquiryDialog) {
    enquiryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!enquiryForm.reportValidity()) return;

      const data = new FormData(enquiryForm);
      const firstName = (data.get("firstName") || "").toString().trim();
      const lastName = (data.get("lastName") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const whatsapp = (data.get("whatsapp") || "").toString().trim();
      const park = (data.get("park") || "").toString().trim();
      const adults = (data.get("adults") || "").toString().trim();
      const kids = (data.get("kids") || "").toString().trim();
      const safariDate = (data.get("safariDate") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      const lines = [
        "Hello Nisha,",
        "",
        "I would like to enquire about a safari:",
        `Name: ${firstName} ${lastName}`.trim(),
        `Email: ${email}`,
        whatsapp ? `WhatsApp: ${whatsapp}` : null,
        park ? `Preferred Park: ${park}` : null,
        `Adults: ${adults}`,
        `Kids: ${kids}`,
        safariDate ? `Preferred Date: ${safariDate}` : null,
        "",
        "Message:",
        message,
      ].filter((line) => line !== null);

      const fullMessage = lines.join("\n");
      const msgPre = enquiryDialog.querySelector(".enquiry-message");
      const emailBtn = enquiryDialog.querySelector(".send-email");
      const waBtn = enquiryDialog.querySelector(".send-whatsapp");

      if (msgPre) msgPre.textContent = fullMessage;
      const subject = encodeURIComponent(
        `Safari Enquiry - ${park || "Sri Lanka"} (${firstName} ${lastName})`
      );
      const encodedBody = encodeURIComponent(fullMessage);
      if (emailBtn) {
        emailBtn.href = `mailto:safarinisha@gmail.com?subject=${subject}&body=${encodedBody}`;
      }
      if (waBtn) {
        waBtn.href = `https://wa.me/94717390327?text=${encodedBody}`;
      }
      if (typeof enquiryDialog.showModal === "function") {
        enquiryDialog.showModal();
      }
    });
  }

  // 5. Firebase CMS Live Hydrator, Floating Admin Dock, On-Page Image Editor & On-Page Text Editor
  const pathname = window.location.pathname || "/";
  const rawSlug = pathname.replace(/^\/+|\/+$/g, "");
  const currentPageFile =
    !rawSlug || rawSlug === "index" || rawSlug === "index.html"
      ? "index.html"
      : rawSlug.endsWith(".html")
        ? rawSlug
        : `${rawSlug}.html`;
  const safePagePrefix = currentPageFile.replace(/[^a-zA-Z0-9_-]/g, "_");

  const params = new URLSearchParams(window.location.search);
  let editModeActive = params.get("editImages") === "1";
  let textEditModeActive = params.get("editText") === "1";

  // Floating Admin Dock removed per user request (accessible via /admin)

  // Create Inline Image Editor Modal
  const editorDialog = document.createElement("dialog");
  editorDialog.className = "admin-inline-dialog";
  editorDialog.innerHTML = `
    <div class="admin-modal-header">
      <div>
        <div class="admin-modal-kicker" id="admin-slot-kicker">Firebase Image Slot</div>
        <h3 id="admin-slot-title">Change Image</h3>
      </div>
      <button type="button" class="admin-modal-close" aria-label="Close">&times;</button>
    </div>
    <form class="admin-modal-body" id="admin-slot-form">
      <div class="admin-preview-grid">
        <div>
          <span class="admin-field-label">Current Image</span>
          <div class="admin-preview-box">
            <img id="admin-current-preview" src="" alt="Current" />
          </div>
        </div>
        <div>
          <span class="admin-field-label">New Upload / Transfer</span>
          <div class="admin-preview-box is-upload" id="admin-upload-trigger">
            <img id="admin-new-preview" src="" alt="New preview" hidden />
            <span id="admin-upload-prompt">Click to upload image<br/><small>JPG, PNG, WebP, SVG</small></span>
          </div>
          <input type="file" id="admin-file-input" accept="image/*" hidden />
        </div>
      </div>
      <div class="admin-scope-row">
        <label>
          <input type="radio" name="adminScope" value="slot" checked />
          <span>Update only this slot</span>
        </label>
        <label>
          <input type="radio" name="adminScope" value="global" />
          <span>Update everywhere file is used</span>
        </label>
      </div>
      <div>
        <label class="admin-field-label" for="admin-url-input">Or Direct Image URL</label>
        <input type="text" id="admin-url-input" class="admin-input" placeholder="https://images.unsplash.com/... (direct web image link)" />
      </div>
      <div id="admin-alt-wrap">
        <label class="admin-field-label" for="admin-alt-input">Alt Text</label>
        <input type="text" id="admin-alt-input" class="admin-input" placeholder="Describe image..." />
      </div>
      <div class="admin-modal-footer">
        <div style="display:flex;gap:8px;align-items:center;">
          <a href="/admin" class="admin-dock-btn">Open R2 + Firebase Studio</a>
          <button type="button" class="admin-dock-btn" id="admin-slot-delete-btn" style="color:#fca5a5;border-color:#5c2424;">Delete from R2</button>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="admin-dock-btn" id="admin-cancel-btn">Cancel</button>
          <button type="submit" class="admin-dock-btn is-primary" id="admin-save-btn">Push to R2 &amp; Save</button>
        </div>
      </div>
    </form>
  `;
  document.body.appendChild(editorDialog);

  // Create Inline Text Editor Modal
  const textEditorDialog = document.createElement("dialog");
  textEditorDialog.className = "admin-inline-dialog";
  textEditorDialog.innerHTML = `
    <div class="admin-modal-header">
      <div>
        <div class="admin-modal-kicker" id="admin-text-kicker">Firebase Text Element</div>
        <h3 id="admin-text-title">Edit Site Text</h3>
      </div>
      <button type="button" class="admin-modal-close" id="admin-text-close" aria-label="Close">&times;</button>
    </div>
    <form class="admin-modal-body" id="admin-text-form">
      <div>
        <label class="admin-field-label" for="admin-text-textarea">Text Content</label>
        <textarea id="admin-text-textarea" rows="5" class="admin-input" placeholder="Enter text content..." required></textarea>
      </div>
      <div class="admin-modal-footer">
        <button type="button" class="admin-dock-btn" id="admin-text-delete-btn" style="color:#fca5a5;border-color:#5c2424;">Delete / Hide Text</button>
        <div style="display:flex;gap:8px;">
          <button type="button" class="admin-dock-btn" id="admin-text-cancel-btn">Cancel</button>
          <button type="submit" class="admin-dock-btn is-primary" id="admin-text-save-btn">Save Text</button>
        </div>
      </div>
    </form>
  `;
  document.body.appendChild(textEditorDialog);

  const closeInlineBtn = editorDialog.querySelector(".admin-modal-close");
  const cancelInlineBtn = document.getElementById("admin-cancel-btn");
  const slotDeleteBtn = document.getElementById("admin-slot-delete-btn");
  const uploadTrigger = document.getElementById("admin-upload-trigger");
  const fileInput = document.getElementById("admin-file-input");
  const newPreviewImg = document.getElementById("admin-new-preview");
  const uploadPrompt = document.getElementById("admin-upload-prompt");
  const currentPreviewImg = document.getElementById("admin-current-preview");
  const urlInput = document.getElementById("admin-url-input");
  const altInput = document.getElementById("admin-alt-input");
  const altWrap = document.getElementById("admin-alt-wrap");
  const slotForm = document.getElementById("admin-slot-form");
  const saveBtn = document.getElementById("admin-save-btn");
  const slotKicker = document.getElementById("admin-slot-kicker");
  const slotTitle = document.getElementById("admin-slot-title");

  const textCloseBtn = document.getElementById("admin-text-close");
  const textCancelBtn = document.getElementById("admin-text-cancel-btn");
  const textDeleteBtn = document.getElementById("admin-text-delete-btn");
  const textSaveBtn = document.getElementById("admin-text-save-btn");
  const textForm = document.getElementById("admin-text-form");
  const textArea = document.getElementById("admin-text-textarea");
  const textKicker = document.getElementById("admin-text-kicker");
  const textTitle = document.getElementById("admin-text-title");

  let activeDomSlot = null;
  let selectedUploadFile = null;
  let activeDomTextSlot = null;

  if (closeInlineBtn) closeInlineBtn.addEventListener("click", () => editorDialog.close());
  if (cancelInlineBtn) cancelInlineBtn.addEventListener("click", () => editorDialog.close());
  editorDialog.addEventListener("click", (e) => {
    if (e.target === editorDialog) editorDialog.close();
  });

  if (textCloseBtn) textCloseBtn.addEventListener("click", () => textEditorDialog.close());
  if (textCancelBtn) textCancelBtn.addEventListener("click", () => textEditorDialog.close());
  textEditorDialog.addEventListener("click", (e) => {
    if (e.target === textEditorDialog) textEditorDialog.close();
  });

  if (uploadTrigger && fileInput) {
    uploadTrigger.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      selectedUploadFile = f;
      if (urlInput) urlInput.value = "";
      if (newPreviewImg) {
        newPreviewImg.src = URL.createObjectURL(f);
        newPreviewImg.hidden = false;
      }
      if (uploadPrompt) uploadPrompt.hidden = true;
    });
  }

  // Bind all editable image slots in exact DOM document order (matching parsePageSlots in lib/image-manager.ts)
  const slotElementMap = new Map();
  function bindEditableSlots() {
    let slotCounter = 0;
    const candidates = Array.from(
      document.querySelectorAll('div[style*="background-image"], img')
    ).filter((el) => {
      if (el.closest("dialog") || el.closest(".firebase-section-showcase") || el.closest(".hero-cross-bridge-wrap")) return false;
      if (el.classList.contains("cross-top-img")) return false;
      if (el.tagName.toLowerCase() === "div") {
        const styleAttr = el.getAttribute("style") || "";
        if (!/background-image\s*:\s*url\(/i.test(styleAttr)) return false;
        if (el.classList.contains("wsite-body-section")) return false;
      }
      if (el.tagName.toLowerCase() === "img" && el.classList.contains("photo-full")) return false;
      if (el.tagName.toLowerCase() === "img" && !el.getAttribute("src")) return false;
      return true;
    });

    candidates.forEach((el) => {
      const idx = slotCounter++;
      const slotId = `${safePagePrefix}__slot_${idx}`;
      el.setAttribute("data-admin-slot", String(idx));
      el.setAttribute("data-admin-slot-id", slotId);

      if (el.tagName.toLowerCase() === "div") {
        slotElementMap.set(slotId, { type: "hero-bg", element: el, slotIndex: idx });
        let heroBtn = el.querySelector(".admin-hero-edit-btn");
        if (!heroBtn) {
          heroBtn = document.createElement("button");
          heroBtn.type = "button";
          heroBtn.className = "admin-hero-edit-btn";
          heroBtn.textContent = "Change Hero Banner Image";
          el.appendChild(heroBtn);
          heroBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const styleAttr = el.getAttribute("style") || "";
            const match = styleAttr.match(/url\(['"]?([^'")]+)['"]?\)/i);
            const currentBg = match ? match[1] : "";
            openInlineEditor({
              slotId,
              slotIndex: idx,
              type: "hero-bg",
              label: "Hero Background Banner",
              src: currentBg,
              alt: "",
              element: el,
            });
          });
        }
      } else {
        slotElementMap.set(slotId, { type: "img", element: el, slotIndex: idx });
        el.addEventListener(
          "click",
          (e) => {
            if (!editModeActive) return;
            e.preventDefault();
            e.stopPropagation();
            openInlineEditor({
              slotId,
              slotIndex: idx,
              type: "img",
              label: el.getAttribute("alt") || `Image Slot #${idx + 1}`,
              src: el.getAttribute("src") || el.src,
              alt: el.getAttribute("alt") || "",
              element: el,
            });
          },
          true
        );
      }
    });
  }

  // Bind all editable text slots in DOM order inside <main>
  const textElementMap = new Map();
  function bindEditableTextSlots() {
    const mainEl = document.querySelector("main") || document.body;
    const candidates = Array.from(
      mainEl.querySelectorAll("h1, h2, h3, h4, p, blockquote, li, span.wsite-button-inner")
    ).filter((el) => {
      if (el.closest("dialog") || el.closest(".firebase-section-showcase") || el.closest(".firebase-custom-texts-wrap")) {
        return false;
      }
      // Skip elements containing nested block elements
      if (el.querySelector("p, div, ul, ol, table, h1, h2, h3, h4")) {
        return false;
      }
      const txt = (el.textContent || "").trim();
      return txt.length >= 2;
    });

    candidates.forEach((el, idx) => {
      const textId = `${safePagePrefix}__text_${idx}`;
      el.setAttribute("data-admin-text-slot", String(idx));
      el.setAttribute("data-admin-text-id", textId);
      textElementMap.set(textId, { element: el, textIndex: idx, tagName: el.tagName.toUpperCase() });

      el.addEventListener(
        "click",
        (e) => {
          if (!textEditModeActive) return;
          e.preventDefault();
          e.stopPropagation();
          openInlineTextEditor({
            textId,
            textIndex: idx,
            tagName: el.tagName.toUpperCase(),
            content: (el.textContent || "").trim(),
            element: el,
          });
        },
        true
      );
    });
  }

  function openInlineEditor(slotInfo) {
    activeDomSlot = slotInfo;
    selectedUploadFile = null;
    if (fileInput) fileInput.value = "";
    if (newPreviewImg) {
      newPreviewImg.src = "";
      newPreviewImg.hidden = true;
    }
    if (uploadPrompt) uploadPrompt.hidden = false;
    if (currentPreviewImg) currentPreviewImg.src = slotInfo.src;
    if (urlInput) urlInput.value = "";
    if (altInput) altInput.value = slotInfo.alt || "";
    if (altWrap) altWrap.hidden = slotInfo.type === "hero-bg";
    if (slotKicker) {
      slotKicker.textContent = `${currentPageFile} · Slot #${slotInfo.slotIndex + 1}`;
    }
    if (slotTitle) {
      slotTitle.textContent = slotInfo.label;
    }
    if (typeof editorDialog.showModal === "function") {
      editorDialog.showModal();
    }
  }

  function openInlineTextEditor(textInfo) {
    activeDomTextSlot = textInfo;
    if (textKicker) {
      textKicker.textContent = `${currentPageFile} · ${textInfo.tagName} (#${textInfo.textIndex + 1})`;
    }
    if (textTitle) {
      textTitle.textContent = "Edit or Delete Site Text via Firebase";
    }
    if (textArea) {
      textArea.value = textInfo.content;
    }
    if (typeof textEditorDialog.showModal === "function") {
      textEditorDialog.showModal();
    }
  }

  if (slotDeleteBtn) {
    slotDeleteBtn.addEventListener("click", async () => {
      if (!activeDomSlot) return;
      try {
        await fetch("/api/admin/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete-slot",
            page: currentPageFile,
            slotIndex: activeDomSlot.slotIndex,
            slotId: activeDomSlot.slotId,
          }),
        });
        if (activeDomSlot.type === "hero-bg") {
          activeDomSlot.element.style.backgroundImage = "none";
        } else {
          activeDomSlot.element.removeAttribute("src");
          activeDomSlot.element.style.display = "none";
        }
        editorDialog.close();
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (slotForm) {
    slotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeDomSlot) return;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Uploading to R2...";
      }
      try {
        const scopeInput = slotForm.querySelector('input[name="adminScope"]:checked');
        const scope = scopeInput ? scopeInput.value : "slot";
        const newAlt = altInput ? altInput.value : "";
        const customUrl = urlInput ? urlInput.value.trim() : "";

        let updatedSrc = activeDomSlot.src;
        let updatedR2Key = undefined;

        if (selectedUploadFile) {
          const r2Fd = new FormData();
          r2Fd.append("file", selectedUploadFile);
          r2Fd.append("replaceKey", `slots/${activeDomSlot.slotId}`);
          r2Fd.append("alt", newAlt || activeDomSlot.label || "");
          r2Fd.append("title", activeDomSlot.label || selectedUploadFile.name);
          r2Fd.append("page", currentPageFile);

          const r2Res = await fetch("/api/r2", {
            method: "POST",
            body: r2Fd,
          });
          const r2Data = await r2Res.json();
          if (!r2Res.ok || !r2Data.cdnUrl) {
            throw new Error(r2Data.error || "R2 bucket upload failed");
          }
          updatedSrc = r2Data.cdnUrl;
          updatedR2Key = r2Data.r2Key;
        } else if (customUrl) {
          updatedSrc = customUrl;
        }

        const res = await fetch("/api/admin/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-slot-meta",
            page: currentPageFile,
            slotIndex: activeDomSlot.slotIndex,
            scope,
            altText: newAlt,
            externalUrl: updatedSrc,
            r2Key: updatedR2Key,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        const cacheUrl = updatedSrc.includes("?")
          ? `${updatedSrc}&v=${Date.now()}`
          : `${updatedSrc}?v=${Date.now()}`;

        if (activeDomSlot.type === "hero-bg") {
          activeDomSlot.element.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${cacheUrl}")`;
        } else {
          activeDomSlot.element.style.display = "";
          activeDomSlot.element.src = cacheUrl;
          activeDomSlot.element.alt = newAlt;
          const parentAnchor = activeDomSlot.element.closest("a[data-lightbox]");
          if (parentAnchor) {
            parentAnchor.href = cacheUrl;
          }
        }
        editorDialog.close();
      } catch (err) {
        console.error(err);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Push to R2 & Save";
        }
      }
    });
  }

  if (textForm) {
    textForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeDomTextSlot || !textArea) return;
      if (textSaveBtn) {
        textSaveBtn.disabled = true;
        textSaveBtn.textContent = "Saving...";
      }
      try {
        const newContent = textArea.value;
        const res = await fetch("/api/admin/cms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save-text",
            textId: activeDomTextSlot.textId,
            page: currentPageFile,
            textIndex: activeDomTextSlot.textIndex,
            tagName: activeDomTextSlot.tagName,
            sectionContext: "Live Page Edit",
            content: newContent,
            isDeleted: false,
            isCustomAdded: Boolean(activeDomTextSlot.isCustomAdded),
          }),
        });
        if (!res.ok) throw new Error("Failed to save text");
        activeDomTextSlot.element.textContent = newContent;
        activeDomTextSlot.element.style.display = "";
        textEditorDialog.close();
      } catch (err) {
        console.error(err);
      } finally {
        if (textSaveBtn) {
          textSaveBtn.disabled = false;
          textSaveBtn.textContent = "Save Text";
        }
      }
    });
  }

  if (textDeleteBtn) {
    textDeleteBtn.addEventListener("click", async () => {
      if (!activeDomTextSlot) return;
      try {
        await fetch("/api/admin/cms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete-text",
            textId: activeDomTextSlot.textId,
            page: currentPageFile,
            textIndex: activeDomTextSlot.textIndex,
            tagName: activeDomTextSlot.tagName,
            content: activeDomTextSlot.content,
            restoreDefault: false,
          }),
        });
        activeDomTextSlot.element.style.display = "none";
        textEditorDialog.close();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Hero Section Multi-Image Slideshow (4-Second Interval)
  let heroSlideshowTimer = null;
  let activeHeroSlideIndex = 0;
  const heroHeaderSectionEl = document.querySelector(".banner-wrap .wsite-header-section");
  const heroBannerWrapEl = document.querySelector(".banner-wrap");
  const initialHeroStyle = (heroHeaderSectionEl && heroHeaderSectionEl.getAttribute("style")) || "";
  const initialHeroMatch = initialHeroStyle.match(/url\(['"]?([^'")]+)['"]?\)/i);
  let primaryHeroBannerSrc = initialHeroMatch ? initialHeroMatch[1] : "";

  const DEFAULT_HERO_SLIDES_BY_PAGE = {
    "index.html": [
      {
        itemId: "hero_slide_home_2",
        src: "/assets/r2-bucket/sections/home_hero_1.jpg",
        r2Key: "sections/home_hero_1.jpg",
        alt: "Yala Leopard Safari — Sri Lankan Leopard resting on granite rock in Yala National Park",
        order: 1,
      },
      {
        itemId: "hero_slide_home_3",
        src: "/assets/r2-bucket/sections/home_parks_1.jpg",
        r2Key: "sections/home_parks_1.jpg",
        alt: "Udawalawe National Park Safari — Wild Sri Lankan elephant herd",
        order: 2,
      },
      {
        itemId: "hero_slide_home_4",
        src: "/assets/r2-bucket/sections/home_welcome_2.jpg",
        r2Key: "sections/home_welcome_2.jpg",
        alt: "Yala National Park Jeep Safari — Custom 4x4 safari jeep in Sri Lanka",
        order: 3,
      },
    ],
    "yala-safari.html": [
      {
        itemId: "hero_slide_yala_2",
        src: "/assets/r2-bucket/sections/yala_sec_leopard_1.jpg",
        r2Key: "sections/yala_sec_leopard_1.jpg",
        alt: "Yala Leopard Safari in Yala National Park Sri Lanka",
        order: 1,
      },
      {
        itemId: "hero_slide_yala_3",
        src: "/assets/r2-bucket/sections/yala_sec_packages_3.jpg",
        r2Key: "sections/yala_sec_packages_3.jpg",
        alt: "Yala National Park Safari landscape at sunrise",
        order: 2,
      },
      {
        itemId: "hero_slide_yala_4",
        src: "/assets/r2-bucket/sections/yala_sec_bear_2.jpg",
        r2Key: "sections/yala_sec_bear_2.jpg",
        alt: "Yala Safari Tours — Sloth bear in Yala National Park",
        order: 3,
      },
    ],
    "udawalawe-safari.html": [
      {
        itemId: "hero_slide_udawalawe_2",
        src: "/assets/r2-bucket/sections/udawalawe_sec_1.jpg",
        r2Key: "sections/udawalawe_sec_1.jpg",
        alt: "Udawalawe National Park Safari — Wild elephant herd",
        order: 1,
      },
      {
        itemId: "hero_slide_udawalawe_3",
        src: "/assets/r2-bucket/sections/udawalawe_sec_2.jpg",
        r2Key: "sections/udawalawe_sec_2.jpg",
        alt: "Udawalawe Safari Tours — Reservoir wildlife",
        order: 2,
      },
    ],
    "bundala-birding-safari.html": [
      {
        itemId: "hero_slide_bundala_2",
        src: "/assets/r2-bucket/sections/bundala_sec_1.jpg",
        r2Key: "sections/bundala_sec_1.jpg",
        alt: "Bundala National Park Safari — Wetland birdlife",
        order: 1,
      },
      {
        itemId: "hero_slide_bundala_3",
        src: "/assets/r2-bucket/sections/bundala_sec_2.jpg",
        r2Key: "sections/bundala_sec_2.jpg",
        alt: "Bundala Wildlife Safari — Lagoon crocodile",
        order: 2,
      },
    ],
    "wilpattu-safari.html": [
      {
        itemId: "hero_slide_wilpattu_2",
        src: "/assets/r2-bucket/sections/wilpattu_sec_1.jpg",
        r2Key: "sections/wilpattu_sec_1.jpg",
        alt: "Wilpattu National Park Safari — Sri Lankan Leopard",
        order: 1,
      },
      {
        itemId: "hero_slide_wilpattu_3",
        src: "/assets/r2-bucket/sections/wilpattu_sec_2.jpg",
        r2Key: "sections/wilpattu_sec_2.jpg",
        alt: "Wilpattu Safari Tours — Spotted deer in forest clearing",
        order: 2,
      },
    ],
    "minneriya-safari.html": [
      {
        itemId: "hero_slide_minneriya_2",
        src: "/assets/r2-bucket/sections/minneriya_sec_1.jpg",
        r2Key: "sections/minneriya_sec_1.jpg",
        alt: "Minneriya Elephant Safari — Elephant gathering",
        order: 1,
      },
      {
        itemId: "hero_slide_minneriya_3",
        src: "/assets/r2-bucket/sections/minneriya_sec_2.jpg",
        r2Key: "sections/minneriya_sec_2.jpg",
        alt: "Minneriya National Park Safari at sunset",
        order: 2,
      },
    ],
    "kumana-birding-safari.html": [
      {
        itemId: "hero_slide_kumana_2",
        src: "/assets/r2-bucket/sections/kumana_sec_1.jpg",
        r2Key: "sections/kumana_sec_1.jpg",
        alt: "Kumana Bird Watching Safari — Waterbirds in Kumana",
        order: 1,
      },
      {
        itemId: "hero_slide_kumana_3",
        src: "/assets/r2-bucket/sections/kumana_sec_2.jpg",
        r2Key: "sections/kumana_sec_2.jpg",
        alt: "Kumana National Park Safari — Wild elephant on trail",
        order: 2,
      },
    ],
    "safari-parks.html": [
      {
        itemId: "hero_slide_parks_2",
        src: "/assets/r2-bucket/sections/parks_overview_1.jpg",
        r2Key: "sections/parks_overview_1.jpg",
        alt: "Sri Lanka Safari Tours across 6 national parks",
        order: 1,
      },
      {
        itemId: "hero_slide_parks_3",
        src: "/assets/r2-bucket/sections/parks_overview_2.jpg",
        r2Key: "sections/parks_overview_2.jpg",
        alt: "Sri Lanka Wildlife Safari landscape",
        order: 2,
      },
    ],
    "about.html": [
      {
        itemId: "hero_slide_about_2",
        src: "/assets/r2-bucket/sections/about_sec_1.jpg",
        r2Key: "sections/about_sec_1.jpg",
        alt: "About Nisha Safari Jeep Tours team",
        order: 1,
      },
      {
        itemId: "hero_slide_about_3",
        src: "/assets/r2-bucket/sections/about_sec_2.jpg",
        r2Key: "sections/about_sec_2.jpg",
        alt: "Sri Lankan leopard wildlife photography with Nisha Safari",
        order: 2,
      },
    ],
    "gallery.html": [
      {
        itemId: "hero_slide_gallery_2",
        src: "/assets/r2-bucket/sections/gallery_sec_1.jpg",
        r2Key: "sections/gallery_sec_1.jpg",
        alt: "Yala Safari Gallery — Leopard in golden light",
        order: 1,
      },
      {
        itemId: "hero_slide_gallery_3",
        src: "/assets/r2-bucket/sections/gallery_sec_2.jpg",
        r2Key: "sections/gallery_sec_2.jpg",
        alt: "Sri Lanka Safari Gallery — Peacock in Yala",
        order: 2,
      },
    ],
    "reviews.html": [
      {
        itemId: "hero_slide_reviews_2",
        src: "/assets/r2-bucket/sections/reviews_sec_1.jpg",
        r2Key: "sections/reviews_sec_1.jpg",
        alt: "Nisha Safari Guest Reviews — Elephant safari encounter",
        order: 1,
      },
      {
        itemId: "hero_slide_reviews_3",
        src: "/assets/r2-bucket/sections/home_welcome_2.jpg",
        r2Key: "sections/home_welcome_2.jpg",
        alt: "Nisha Safari custom 4x4 safari jeep",
        order: 2,
      },
    ],
  };

  function extractR2KeyClient(src, explicitKey) {
    if (explicitKey && String(explicitKey).trim()) {
      return String(explicitKey).trim().replace(/^\/+/, "");
    }
    if (!src) return "";
    const clean = String(src).split("?")[0].trim();
    if (clean.includes("/api/r2/file/")) {
      return clean.slice(clean.indexOf("/api/r2/file/") + "/api/r2/file/".length).replace(/^\/+/, "");
    }
    if (clean.includes("/assets/r2-bucket/")) {
      return clean.slice(clean.indexOf("/assets/r2-bucket/") + "/assets/r2-bucket/".length).replace(/^\/+/, "");
    }
    const cdnMatch = clean.match(/^https?:\/\/[^/]+\/((?:slots|sections|media|uploads|index|yala-safari|udawalawe-safari|bundala-birding-safari|wilpattu-safari|minneriya-safari|kumana-birding-safari|safari-parks|about|gallery|reviews|contact)\/.+)$/i);
    if (cdnMatch && cdnMatch[1]) {
      return cdnMatch[1].replace(/^\/+/, "");
    }
    return "";
  }

  function normalizeSlideSrc(src, r2Key) {
    if (!src) return "";
    const trimmed = String(src).trim();
    if (trimmed === "/deleted") return "";
    const key = extractR2KeyClient(trimmed, r2Key);
    // Built-in static R2 bucket folders (sections/* and slots/*) are always present in /assets/r2-bucket/
    // Using /assets/r2-bucket/<key> directly guarantees instant loading on static Cloudflare Pages, Workers, and Next.js
    if (
      key &&
      (key.startsWith("sections/") || key.startsWith("slots/")) &&
      trimmed.startsWith("/api/r2/file/")
    ) {
      return `/assets/r2-bucket/${key}`;
    }
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("data:")
    ) {
      return trimmed;
    }
    if (trimmed.includes(".")) {
      return "https://" + trimmed;
    }
    return "/" + trimmed;
  }

  function buildFallbackUrls(primaryUrl, r2Key) {
    const candidates = [primaryUrl];
    const key = extractR2KeyClient(primaryUrl, r2Key);
    if (key) {
      const staticBucketUrl = `/assets/r2-bucket/${key}`;
      const workerApiUrl = `/api/r2/file/${key}`;
      const cdnUrl = `https://cdn.srilankabestsafari.com/${key}`;
      [staticBucketUrl, cdnUrl, workerApiUrl].forEach((u) => {
        if (!candidates.includes(u)) candidates.push(u);
      });
    }
    return candidates;
  }

  function initOrUpdateHeroSlideshow(slidesList) {
    if (!heroHeaderSectionEl || document.body.classList.contains("janaka-contact")) return;

    if (heroSlideshowTimer) {
      clearInterval(heroSlideshowTimer);
      heroSlideshowTimer = null;
    }

    const seen = new Set();
    const validSlides = [];
    (slidesList || []).forEach((item) => {
      const rawSrc = typeof item === "string" ? item : item && item.src;
      const rawKey = typeof item === "object" && item ? item.r2Key : "";
      const normalized = normalizeSlideSrc(rawSrc, rawKey);
      if (!normalized || /^data:/i.test(normalized) || /payment-|visa|mastercard/i.test(normalized)) {
        return;
      }
      const dedupeKey = extractR2KeyClient(normalized, rawKey) || normalized;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        validSlides.push({
          src: normalized,
          r2Key: rawKey || extractR2KeyClient(normalized, ""),
          alt: (typeof item === "object" && item && (item.alt || item.title)) || "Sri Lanka Safari Hero Slide",
        });
      }
    });

    let stage = heroHeaderSectionEl.querySelector(".hero-slideshow-stage");
    let dotsWrap = heroBannerWrapEl ? heroBannerWrapEl.querySelector(".hero-slideshow-dots") : null;

    if (validSlides.length === 0) {
      if (stage) stage.remove();
      if (dotsWrap) dotsWrap.remove();
      return;
    }

    if (!stage) {
      stage = document.createElement("div");
      stage.className = "hero-slideshow-stage";
      stage.setAttribute("aria-hidden", "true");
      heroHeaderSectionEl.insertBefore(stage, heroHeaderSectionEl.firstChild);
    }

    stage.innerHTML = "";
    activeHeroSlideIndex = 0;

    validSlides.forEach((slide, idx) => {
      const layer = document.createElement("div");
      layer.className = "hero-slide-layer" + (idx === 0 ? " is-active" : "");
      layer.style.backgroundImage = `url("${slide.src}")`;
      layer.setAttribute("role", "img");
      layer.setAttribute("aria-label", slide.alt);
      stage.appendChild(layer);

      // Verify image URL loads and automatically fall back if needed on Cloudflare Pages
      const fallbacks = buildFallbackUrls(slide.src, slide.r2Key);
      if (fallbacks.length > 1) {
        let attempt = 0;
        const testLoad = (urlToTry) => {
          const probe = new Image();
          probe.onload = () => {
            if (attempt > 0) {
              slide.src = urlToTry;
              layer.style.backgroundImage = `url("${urlToTry}")`;
              if (activeHeroSlideIndex === idx) {
                heroHeaderSectionEl.style.backgroundImage = `url("${urlToTry}")`;
              }
            }
          };
          probe.onerror = () => {
            attempt++;
            if (attempt < fallbacks.length) {
              testLoad(fallbacks[attempt]);
            }
          };
          probe.src = urlToTry;
        };
        testLoad(fallbacks[0]);
      }
    });

    heroHeaderSectionEl.style.backgroundImage = `url("${validSlides[0].src}")`;
    heroHeaderSectionEl.style.backgroundSize = "cover";
    heroHeaderSectionEl.style.backgroundPosition = "center 35%";

    if (validSlides.length > 1 && heroBannerWrapEl) {
      if (!dotsWrap) {
        dotsWrap = document.createElement("div");
        dotsWrap.className = "hero-slideshow-dots";
        dotsWrap.setAttribute("role", "tablist");
        dotsWrap.setAttribute("aria-label", "Hero Section Slideshow Controls");
        heroBannerWrapEl.appendChild(dotsWrap);
      }
      dotsWrap.innerHTML = "";

      const goToSlide = (targetIdx) => {
        const layers = stage.querySelectorAll(".hero-slide-layer");
        const dots = dotsWrap ? dotsWrap.querySelectorAll(".hero-slideshow-dot") : [];
        if (!layers.length) return;
        activeHeroSlideIndex = ((targetIdx % validSlides.length) + validSlides.length) % validSlides.length;
        layers.forEach((l, i) => {
          l.classList.toggle("is-active", i === activeHeroSlideIndex);
        });
        dots.forEach((d, i) => {
          d.classList.toggle("is-active", i === activeHeroSlideIndex);
          d.setAttribute("aria-selected", String(i === activeHeroSlideIndex));
        });
        heroHeaderSectionEl.style.backgroundImage = `url("${validSlides[activeHeroSlideIndex].src}")`;
      };

      const startTimer = () => {
        if (heroSlideshowTimer) clearInterval(heroSlideshowTimer);
        heroSlideshowTimer = setInterval(() => {
          goToSlide(activeHeroSlideIndex + 1);
        }, 4000);
      };

      validSlides.forEach((slide, idx) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "hero-slideshow-dot" + (idx === 0 ? " is-active" : "");
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-selected", String(idx === 0));
        dot.setAttribute("aria-label", `Hero Slide ${idx + 1}: ${slide.alt}`);
        dot.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          goToSlide(idx);
          startTimer();
        });
        dotsWrap.appendChild(dot);
      });

      startTimer();
    } else if (dotsWrap) {
      dotsWrap.remove();
    }
  }

  // Immediately start 4-Second Hero Slideshow on initial render using default slides for this page
  if (heroHeaderSectionEl && !document.body.classList.contains("janaka-contact")) {
    const initialSlides = [];
    if (primaryHeroBannerSrc) {
      initialSlides.push({
        src: primaryHeroBannerSrc,
        alt: document.title || "Sri Lanka Safari Hero Banner",
      });
    }
    const defaultExtraSlides = DEFAULT_HERO_SLIDES_BY_PAGE[currentPageFile] || [];
    defaultExtraSlides.forEach((s) => initialSlides.push(s));
    if (initialSlides.length > 0) {
      initOrUpdateHeroSlideshow(initialSlides);
    }
  }

  // Direct Firebase Firestore REST API reader so Cloudflare Pages deployments always reflect live /admin edits
  const FIRESTORE_BASE_URL =
    "https://firestore.googleapis.com/v1/projects/gen-lang-client-0113753106/databases/ai-studio-janakasafarijeep-76940b71-abf8-4b59-aaeb-d5237818c8d7/documents";

  function parseFirestoreRestDoc(docObj) {
    if (!docObj || !docObj.fields) return null;
    const out = {};
    for (const [k, v] of Object.entries(docObj.fields)) {
      if (!v || typeof v !== "object") continue;
      if ("stringValue" in v) out[k] = v.stringValue;
      else if ("integerValue" in v) out[k] = Number(v.integerValue);
      else if ("doubleValue" in v) out[k] = Number(v.doubleValue);
      else if ("booleanValue" in v) out[k] = Boolean(v.booleanValue);
      else if ("timestampValue" in v) out[k] = v.timestampValue;
      else if ("nullValue" in v) out[k] = null;
    }
    return out;
  }

  async function fetchFirestorePublicCollection(collectionName) {
    try {
      const res = await fetch(`${FIRESTORE_BASE_URL}/${collectionName}?pageSize=300`, {
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data.documents)) return [];
      return data.documents.map(parseFirestoreRestDoc).filter(Boolean);
    } catch {
      return [];
    }
  }

  async function fetchBaseCmsState() {
    try {
      const res = await fetch(`/api/admin/cms?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          return await res.json();
        }
      }
    } catch {
      // fallback to static JSON asset on Cloudflare Pages
    }
    try {
      const fallbackRes = await fetch(`/assets/firebase-cms-state.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }
    } catch {
      // ignore
    }
    return {
      sectionGalleryItems: [],
      imageOverrides: {},
      textSlots: [],
      customTexts: [],
    };
  }

  // Hydrate page with Firebase CMS state (slot image R2 CDN overrides, 4s hero slideshow, section wildlife galleries, text edits, and custom text blocks)
  async function hydrateFromFirebaseCms() {
    try {
      const [cms, fbSiteImages, fbSectionItems, fbSiteTexts] = await Promise.all([
        fetchBaseCmsState(),
        fetchFirestorePublicCollection("site_images"),
        fetchFirestorePublicCollection("section_gallery_items"),
        fetchFirestorePublicCollection("site_texts"),
      ]);

      if (!cms.imageOverrides) cms.imageOverrides = {};
      if (!Array.isArray(cms.sectionGalleryItems)) cms.sectionGalleryItems = [];

      // Merge default hero slides for this page if not already in cms.sectionGalleryItems
      const defaultPageSlides = DEFAULT_HERO_SLIDES_BY_PAGE[currentPageFile] || [];
      const existingSecIds = new Set(cms.sectionGalleryItems.map((i) => i && i.itemId));
      defaultPageSlides.forEach((ds) => {
        if (!existingSecIds.has(ds.itemId)) {
          cms.sectionGalleryItems.push({
            ...ds,
            page: currentPageFile,
            sectionKey: "hero_slideshow",
            sectionTitle: "Hero Section Slideshow (4s)",
            title: ds.alt,
            caption: "",
          });
        }
      });

      // Merge live Firestore site_images on top of cms.imageOverrides
      fbSiteImages.forEach((docItem) => {
        if (!docItem || !docItem.slotId) return;
        if (docItem.src === "/deleted") {
          cms.imageOverrides[docItem.slotId] = {
            ...docItem,
            src: "",
            lightboxHref: "",
            isDeleted: true,
          };
        } else if (docItem.src && !/^data:/i.test(docItem.src)) {
          const existingOv = cms.imageOverrides[docItem.slotId];
          if (!existingOv || !existingOv.isDeleted) {
            cms.imageOverrides[docItem.slotId] = {
              ...existingOv,
              ...docItem,
              isDeleted: false,
            };
          }
        }
      });

      // Merge live Firestore section_gallery_items (including hero_slideshow additions & deletions)
      if (fbSectionItems.length > 0) {
        const secMap = new Map();
        cms.sectionGalleryItems.forEach((item) => {
          if (item && item.itemId) secMap.set(item.itemId, item);
        });
        fbSectionItems.forEach((fbItem) => {
          if (!fbItem || !fbItem.itemId) return;
          if (fbItem.sectionKey === "deleted_section_item" || fbItem.src === "/deleted") {
            secMap.delete(fbItem.itemId);
          } else {
            secMap.set(fbItem.itemId, fbItem);
          }
        });
        cms.sectionGalleryItems = Array.from(secMap.values());
      }

      // Merge live Firestore site_texts
      if (fbSiteTexts.length > 0) {
        if (!Array.isArray(cms.textSlots)) cms.textSlots = [];
        if (!Array.isArray(cms.customTexts)) cms.customTexts = [];
        const textSlotMap = new Map(cms.textSlots.map((t) => [t.textId, t]));
        const customTextMap = new Map(cms.customTexts.map((t) => [t.textId, t]));

        fbSiteTexts.forEach((ft) => {
          if (!ft || !ft.textId) return;
          if (ft.isCustomAdded) {
            customTextMap.set(ft.textId, { ...ft, isModified: true });
          } else if (textSlotMap.has(ft.textId)) {
            textSlotMap.set(ft.textId, {
              ...textSlotMap.get(ft.textId),
              ...ft,
              isModified: true,
            });
          } else {
            textSlotMap.set(ft.textId, { ...ft, isModified: true });
          }
        });
        cms.textSlots = Array.from(textSlotMap.values());
        cms.customTexts = Array.from(customTextMap.values());
      }

      let heroSlotDeleted = false;

      // 1. Apply image slot overrides (strictly R2 CDN links or explicit slot deletions, never raw data: URIs)
      if (cms.imageOverrides) {
        Object.values(cms.imageOverrides).forEach((ov) => {
          if (!ov || ov.page !== currentPageFile) return;
          const entry = slotElementMap.get(ov.slotId);
          if (!entry) return;

          if (ov.isDeleted || ov.src === "/deleted") {
            if (entry.type === "hero-bg") {
              heroSlotDeleted = true;
              primaryHeroBannerSrc = "";
              entry.element.style.backgroundImage = "none";
            } else {
              entry.element.removeAttribute("src");
              entry.element.style.display = "none";
              const holder =
                entry.element.closest(".galleryImageHolder") ||
                entry.element.closest("a[data-lightbox]") ||
                entry.element.closest(".wsite-image");
              if (holder) {
                holder.style.display = "none";
              }
            }
            return;
          }

          if (!ov.src || /^data:/i.test(ov.src)) return;
          const resolvedOvSrc = normalizeSlideSrc(ov.src, ov.r2Key);

          if (entry.type === "hero-bg") {
            if (/payment-|visa|mastercard/i.test(resolvedOvSrc)) return;
            if (entry.element.classList.contains("wsite-body-section")) return;
            if (document.body.classList.contains("janaka-contact")) return;
            primaryHeroBannerSrc = resolvedOvSrc;
            entry.element.style.backgroundImage = `url("${resolvedOvSrc}")`;
            entry.element.style.backgroundSize = "cover";
            entry.element.style.backgroundPosition = "center center";
          } else {
            if (
              entry.element.closest(".hero-cross-bridge-wrap") ||
              entry.element.id === "CDSWIDCOELOGO"
            ) {
              return;
            }
            entry.element.style.display = "";
            const holder =
              entry.element.closest(".galleryImageHolder") ||
              entry.element.closest("a[data-lightbox]") ||
              entry.element.closest(".wsite-image");
            if (holder) {
              holder.style.display = "";
            }
            entry.element.src = resolvedOvSrc;
            if (ov.alt) entry.element.alt = ov.alt;
            const parentAnchor = entry.element.closest("a[data-lightbox]");
            if (parentAnchor) parentAnchor.href = normalizeSlideSrc(ov.lightboxHref || ov.src, ov.r2Key);
          }
        });
      }

      // 1b. Build & start 4-Second Hero Section Multi-Image Slideshow for this page
      const pageHeroSlides = Array.isArray(cms.sectionGalleryItems)
        ? cms.sectionGalleryItems
            .filter(
              (item) =>
                item.page === currentPageFile &&
                item.sectionKey === "hero_slideshow" &&
                item.src &&
                item.src !== "/deleted" &&
                !/^data:/i.test(item.src)
            )
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

      const combinedHeroSlides = [];
      if (!heroSlotDeleted && primaryHeroBannerSrc) {
        combinedHeroSlides.push({
          src: primaryHeroBannerSrc,
          alt: document.title || "Sri Lanka Safari Hero Banner",
        });
      }
      pageHeroSlides.forEach((s) => {
        combinedHeroSlides.push({
          src: s.src,
          r2Key: s.r2Key,
          alt: s.alt || s.title || "Sri Lanka Safari Hero Slide",
        });
      });
      initOrUpdateHeroSlideshow(combinedHeroSlides);

      // 2. Apply text overrides & deletions for this page
      if (Array.isArray(cms.textSlots)) {
        cms.textSlots
          .filter((t) => t.page === currentPageFile && t.isModified)
          .forEach((t) => {
            const entry = textElementMap.get(t.textId);
            if (!entry) return;
            if (t.isDeleted) {
              entry.element.style.display = "none";
            } else {
              entry.element.style.display = "";
              entry.element.textContent = t.content;
            }
          });
      }

      // 3. Render Custom Added Text Blocks for this page
      const pageCustomTexts = Array.isArray(cms.customTexts)
        ? cms.customTexts.filter((t) => t.page === currentPageFile && !t.isDeleted)
        : [];
      let customTextWrap = document.getElementById("firebase-custom-texts");
      const mainEl = document.querySelector("main");
      if (pageCustomTexts.length > 0 && mainEl) {
        if (!customTextWrap) {
          customTextWrap = document.createElement("section");
          customTextWrap.id = "firebase-custom-texts";
          customTextWrap.className = "firebase-custom-texts-wrap";
          mainEl.appendChild(customTextWrap);
        }
        customTextWrap.innerHTML = "";
        pageCustomTexts.forEach((block) => {
          const card = document.createElement("div");
          card.className = "firebase-custom-text-card";
          const h3 = document.createElement("h3");
          h3.textContent = block.sectionContext || "Safari Update";
          const p = document.createElement("p");
          p.textContent = block.content;
          p.setAttribute("data-admin-text-slot", "custom");
          p.addEventListener("click", (e) => {
            if (!textEditModeActive) return;
            e.preventDefault();
            e.stopPropagation();
            openInlineTextEditor({
              textId: block.textId,
              textIndex: -1,
              tagName: "CUSTOM",
              content: block.content,
              isCustomAdded: true,
              element: p,
            });
          });
          card.appendChild(h3);
          card.appendChild(p);
          customTextWrap.appendChild(card);
        });
      }

      // 4. Render Curated Firebase Section Wildlife Gallery for this page (excluding hero_slideshow items)
      const pageSectionItems = Array.isArray(cms.sectionGalleryItems)
        ? cms.sectionGalleryItems.filter(
            (item) =>
              item.page === currentPageFile &&
              item.sectionKey !== "hero_slideshow" &&
              item.sectionKey !== "deleted_section_item" &&
              item.src &&
              item.src !== "/deleted" &&
              !/^data:/i.test(item.src)
          )
        : [];
      if (pageSectionItems.length > 0 && mainEl) {
        let showcase = document.getElementById("firebase-section-gallery");
        if (!showcase) {
          showcase = document.createElement("section");
          showcase.id = "firebase-section-gallery";
          showcase.className = "firebase-section-showcase";
          mainEl.appendChild(showcase);
        }

        const sectionGroupsTitle = pageSectionItems[0].sectionTitle || "Featured Safari Moments";
        showcase.innerHTML = `
          <div class="firebase-section-header">
            <div>
              <div class="firebase-section-kicker">R2 Bucket + Firebase Section Gallery</div>
              <h2 class="firebase-section-title">${sectionGroupsTitle}</h2>
            </div>
            <a href="/admin" class="admin-dock-btn">Manage R2 Photos in Studio</a>
          </div>
          <div class="firebase-section-grid" id="firebase-section-grid"></div>
        `;

        const grid = showcase.querySelector("#firebase-section-grid");
        pageSectionItems.forEach((item) => {
          const card = document.createElement("article");
          card.className = "firebase-section-card";
          const displaySecSrc = normalizeSlideSrc(item.src, item.r2Key);
          card.innerHTML = `
            <div>
              <div class="firebase-section-card-media">
                <img src="${displaySecSrc}" alt="${item.alt || item.title}" loading="lazy" />
              </div>
              <div class="firebase-section-card-body">
                <div class="firebase-section-card-tag">${item.sectionTitle}</div>
                <h3 class="firebase-section-card-heading">${item.title}</h3>
                <p class="firebase-section-card-caption">${item.caption || ""}</p>
              </div>
            </div>
            <div class="firebase-section-card-actions">
              <a href="/admin" class="admin-dock-btn is-primary">Edit / Replace in R2 Studio</a>
              <button type="button" class="admin-dock-btn" data-delete-sec-img="${item.itemId}">Delete</button>
            </div>
          `;
          const delBtn = card.querySelector("[data-delete-sec-img]");
          if (delBtn) {
            delBtn.addEventListener("click", async () => {
              await fetch("/api/admin/cms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "delete-section-image",
                  itemId: item.itemId,
                  r2Key: item.r2Key,
                }),
              });
              card.remove();
            });
          }
          if (grid) grid.appendChild(card);
        });
      }
    } catch (err) {
      console.error("Failed to hydrate Firebase CMS state:", err);
    }
  }

  function applyEditModeState() {
    document.body.classList.toggle("admin-edit-mode", editModeActive);
    document.body.classList.toggle("admin-text-edit-mode", textEditModeActive);
  }

  function initUltraSmoothScroll() {
    // Smooth in-page hash anchor navigation without blocking native wheel/touch scroll
    document.addEventListener("click", (e) => {
      const anchor = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const targetEl = document.querySelector(hash);
      if (targetEl) {
        e.preventDefault();
        const rect = targetEl.getBoundingClientRect();
        const targetTop = Math.max(0, window.scrollY + rect.top - 24);
        window.scrollTo({ top: targetTop, behavior: "smooth" });
        history.pushState(null, "", hash);
      }
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.head.appendChild(s);
    });
  }

  async function initDistinctGsapAnimations() {
    try {
      if (!window.gsap) {
        await loadScript("/assets/js/gsap.min.js?v=gsap20");
      }
      if (!window.ScrollTrigger) {
        await loadScript("/assets/js/ScrollTrigger.min.js?v=gsap20");
      }
    } catch (err) {
      console.warn("Local GSAP load fallback:", err);
      try {
        if (!window.gsap) {
          await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
        }
        if (!window.ScrollTrigger) {
          await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js");
        }
      } catch (e2) {
        console.warn("GSAP load failed:", e2);
        return;
      }
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const viewportReplayRegistry = [];
    function registerForViewportReplay(anim, triggerEl) {
      if (anim && triggerEl) {
        viewportReplayRegistry.push({ anim, triggerEl });
      }
      return anim;
    }

    function replayVisibleAnimations() {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      viewportReplayRegistry.forEach(({ anim, triggerEl }) => {
        if (!triggerEl || !document.body.contains(triggerEl)) return;
        if (anim.datasetPlayedOnce) return;
        const rect = triggerEl.getBoundingClientRect();
        if (rect.top < vh * 0.92 && rect.bottom > vh * 0.08) {
          anim.datasetPlayedOnce = true;
          if (anim.progress() === 0) {
            anim.play(0);
          }
        }
      });
    }

    // Animated counters helper (plays once on downward scroll per page load/refresh)
    function initCrossBridgeCounters(toggleMode = "play none none none") {
      const crossCard = document.querySelector(".hero-cross-bridge-card");
      if (!crossCard) return;

      const scoreEl = crossCard.querySelector(".cross-score");
      if (scoreEl) {
        const scoreObj = { val: 0 };
        const t1 = gsap.fromTo(
          scoreObj,
          { val: 0 },
          {
            val: 4.9,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: crossCard,
              start: "top 95%",
              toggleActions: toggleMode,
              once: true,
            },
            onUpdate: () => {
              scoreEl.textContent = scoreObj.val.toFixed(1);
            },
          }
        );
        registerForViewportReplay(t1, crossCard);
      }

      const metricEl = crossCard.querySelector(".cross-metric");
      if (metricEl) {
        const countObj = { val: 0 };
        const t2 = gsap.fromTo(
          countObj,
          { val: 0 },
          {
            val: 12500,
            duration: 1.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: crossCard,
              start: "top 95%",
              toggleActions: toggleMode,
              once: true,
            },
            onUpdate: () => {
              metricEl.textContent = `${Math.round(countObj.val).toLocaleString()}+`;
            },
          }
        );
        registerForViewportReplay(t2, crossCard);
      }
    }

    // Shared helper to animate #firebase-section-gallery & #firebase-section-grid items (Selector 5)
    // whether rendered before or after GSAP initialization
    function animateFirebaseSectionGallery() {
      const showcase = document.getElementById("firebase-section-gallery");
      const grid = document.getElementById("firebase-section-grid");
      if (!showcase || !grid || grid.dataset.gsapAnimated === "true") return;
      grid.dataset.gsapAnimated = "true";

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const header = showcase.querySelector(".firebase-section-header");
      const kicker = showcase.querySelector(".firebase-section-kicker");
      const title = showcase.querySelector(".firebase-section-title");
      const headerBtn = showcase.querySelector(".firebase-section-header .admin-dock-btn");
      const cards = gsap.utils.toArray(grid.querySelectorAll(".firebase-section-card"));

      if (isMobile) {
        const showcaseTl = gsap.timeline({
          scrollTrigger: {
            trigger: showcase,
            start: "top 92%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        showcaseTl.fromTo(
          showcase,
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" }
        );
        if (header) {
          showcaseTl.fromTo(
            [kicker, title, headerBtn].filter(Boolean),
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power2.out",
            },
            "-=0.3"
          );
        }
        registerForViewportReplay(showcaseTl, showcase);

        cards.forEach((card) => {
          const img = card.querySelector(".firebase-section-card-media img");
          const innerItems = gsap.utils.toArray(
            card.querySelectorAll(
              ".firebase-section-card-tag, .firebase-section-card-heading, .firebase-section-card-caption, .firebase-section-card-actions .admin-dock-btn"
            )
          );
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          tl.fromTo(
            card,
            { y: 28, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
          );
          if (img) {
            tl.fromTo(
              img,
              { scale: 1.15, autoAlpha: 0.7 },
              { scale: 1, autoAlpha: 1, duration: 0.6, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (innerItems.length > 0) {
            tl.fromTo(
              innerItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.07, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(tl, card);
        });
      } else {
        const headerTl = gsap.timeline({
          scrollTrigger: {
            trigger: showcase,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        headerTl.fromTo(
          showcase,
          { y: 36, autoAlpha: 0, scale: 0.97 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out" }
        );
        if (kicker) {
          headerTl.fromTo(
            kicker,
            { x: -45, autoAlpha: 0, skewX: -10 },
            { x: 0, autoAlpha: 1, skewX: 0, duration: 0.65, ease: "expo.out" },
            "-=0.45"
          );
        }
        if (title) {
          headerTl.fromTo(
            title,
            { y: 35, autoAlpha: 0, scale: 0.92, rotateX: 20, transformPerspective: 900 },
            { y: 0, autoAlpha: 1, scale: 1, rotateX: 0, transformPerspective: 900, duration: 0.75, ease: "back.out(1.7)" },
            "-=0.45"
          );
        }
        if (headerBtn) {
          headerTl.fromTo(
            headerBtn,
            { x: 40, scale: 0.82, autoAlpha: 0 },
            { x: 0, scale: 1, autoAlpha: 1, duration: 0.75, ease: "elastic.out(1, 0.55)" },
            "-=0.5"
          );
        }
        registerForViewportReplay(headerTl, showcase);

        const galleryVectors = [
          { x: -65, y: 45, rotate: -4, scale: 0.88, transformPerspective: 1000 },
          { x: 0, y: 70, rotateX: 26, scale: 0.86, transformPerspective: 1000 },
          { x: 65, y: 45, rotate: 4, scale: 0.88, transformPerspective: 1000 },
          { x: -55, y: 55, rotateY: 22, scale: 0.88, transformPerspective: 1000 },
          { x: 0, y: 65, rotate: -3, scale: 0.86, transformPerspective: 1000 },
          { x: 55, y: 55, rotateY: -22, scale: 0.88, transformPerspective: 1000 },
        ];

        cards.forEach((card, i) => {
          const vec = galleryVectors[i % galleryVectors.length];
          const img = card.querySelector(".firebase-section-card-media img");
          const tag = card.querySelector(".firebase-section-card-tag");
          const heading = card.querySelector(".firebase-section-card-heading");
          const caption = card.querySelector(".firebase-section-card-caption");
          const actions = gsap.utils.toArray(card.querySelectorAll(".firebase-section-card-actions .admin-dock-btn"));

          const cardTl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true,
            },
          });

          cardTl.fromTo(
            card,
            { ...vec, autoAlpha: 0 },
            {
              x: 0,
              y: 0,
              rotate: 0,
              rotateX: 0,
              rotateY: 0,
              scale: 1,
              transformPerspective: 1000,
              autoAlpha: 1,
              duration: 0.85,
              delay: (i % 3) * 0.08,
              ease: "back.out(1.45)",
            }
          );

          if (img) {
            cardTl.fromTo(
              img,
              { scale: 1.24, autoAlpha: 0.6 },
              { scale: 1, autoAlpha: 1, duration: 0.9, ease: "power2.out" },
              "-=0.7"
            );
          }
          if (tag) {
            cardTl.fromTo(
              tag,
              { x: -20, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.7)" },
              "-=0.6"
            );
          }
          if (heading) {
            cardTl.fromTo(
              heading,
              { y: 18, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.6)" },
              "-=0.45"
            );
          }
          if (caption) {
            cardTl.fromTo(
              caption,
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out" },
              "-=0.38"
            );
          }
          if (actions.length > 0) {
            cardTl.fromTo(
              actions,
              { scale: 0.82, y: 12, autoAlpha: 0 },
              { scale: 1, y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.08, ease: "elastic.out(1, 0.55)" },
              "-=0.35"
            );
          }
          registerForViewportReplay(cardTl, card);

          if (hasFinePointer && card instanceof HTMLElement) {
            card.style.transformStyle = "preserve-3d";
            card.addEventListener("mousemove", (e) => {
              const rect = card.getBoundingClientRect();
              const relX = (e.clientX - rect.left) / rect.width - 0.5;
              const relY = (e.clientY - rect.top) / rect.height - 0.5;
              gsap.to(card, {
                rotateY: relX * 10,
                rotateX: -relY * 10,
                y: -8,
                scale: 1.025,
                transformPerspective: 900,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto",
              });
            });
            card.addEventListener("mouseleave", () => {
              gsap.to(card, {
                rotateY: 0,
                rotateX: 0,
                y: 0,
                scale: 1,
                transformPerspective: 900,
                duration: 0.65,
                ease: "elastic.out(1, 0.5)",
                overwrite: "auto",
              });
            });
          }
        });
      }

      ScrollTrigger.refresh();
    }

    window.__animateFirebaseSectionGallery = animateFirebaseSectionGallery;

    const mm = gsap.matchMedia();

    // ============================================================================
    // A. MOBILE-FIRST GSAP PROFILE (max-width: 767px)
    // ============================================================================
    mm.add("(max-width: 767px)", () => {
      const heroBg = document.querySelector(".banner-wrap .wsite-header-section");
      if (heroBg) {
        gsap.set(heroBg, { clearProps: "transform,scale" });
      }

      // 1. Mobile Header subtle fade-in
      const mobileHeaderItems = gsap.utils.toArray(
        ".dusk-header .logo, .dusk-header .header-action-contact, .dusk-header .hamburger"
      );
      if (mobileHeaderItems.length > 0) {
        gsap.fromTo(
          mobileHeaderItems,
          { y: -14, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: "power2.out",
          }
        );
      }

      // 2. Mobile Hero content & items reveal
      if (!document.body.classList.contains("janaka-contact")) {
        const heroSectionContent = document.querySelector(".banner-wrap .wsite-header-section .wsite-section-content");
        const heroEls = gsap.utils.toArray(
          ".banner .hero-editorial-kicker, .banner h2.wsite-content-title, .banner .sri-lanka-tracks, .banner .paragraph, .banner .wsite-button"
        );
        const mobileHeroTl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: ".banner-wrap",
            start: "top 95%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        if (heroSectionContent) {
          mobileHeroTl.fromTo(
            heroSectionContent,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.5 }
          );
        }
        if (heroEls.length > 0) {
          mobileHeroTl.fromTo(
            heroEls,
            { y: 22, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.55,
              stagger: 0.09,
            },
            "-=0.3"
          );
        }
        registerForViewportReplay(mobileHeroTl, document.querySelector(".banner-wrap"));
      } else {
        const contactTop = gsap.utils.toArray(
          "body.janaka-contact .banner h2.wsite-content-title, body.janaka-contact .banner > .wsite-section-elements > .paragraph"
        );
        if (contactTop.length > 0) {
          gsap.fromTo(
            contactTop,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: "power2.out" }
          );
        }
        const contactCols = gsap.utils.toArray(
          "body.janaka-contact .contact-cards > .wsite-multicol-table-wrap > .wsite-multicol-table > .wsite-multicol-tbody > .wsite-multicol-tr > .wsite-multicol-col"
        );
        contactCols.forEach((col) => {
          const t = gsap.fromTo(
            col,
            { y: 22, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: {
                trigger: col,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(t, col);
        });
      }

      // 3. Mobile Cross-Section Bridge Card & Sub-Sections (Selector 1)
      const crossCard = document.querySelector(".hero-cross-bridge-card");
      if (crossCard) {
        const crossTl = gsap.timeline({
          scrollTrigger: {
            trigger: crossCard,
            start: "top 95%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        crossTl.fromTo(
          crossCard,
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55, ease: "power2.out" }
        );
        const crossSubs = gsap.utils.toArray(".hero-cross-sub-section");
        if (crossSubs.length > 0) {
          crossTl.fromTo(
            crossSubs,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power2.out" },
            "-=0.3"
          );
        }
        registerForViewportReplay(crossTl, crossCard);
        initCrossBridgeCounters("play none none none");
      }

      // 4. Mobile Direct Booking Section & Items (Selector 3: .wsite-background-75 .container)
      const mobileDirectContainer = document.querySelector(".wsite-background-75 .container");
      if (mobileDirectContainer) {
        const directItems = gsap.utils.toArray(
          mobileDirectContainer.querySelectorAll(
            "h2.wsite-content-title, .paragraph, .wsite-button, .janaka-payment-card"
          )
        );
        const directTl = gsap.timeline({
          scrollTrigger: {
            trigger: mobileDirectContainer,
            start: "top 92%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        directTl.fromTo(
          mobileDirectContainer,
          { y: 28, scale: 0.96, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
        );
        if (directItems.length > 0) {
          directTl.fromTo(
            directItems,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.48, stagger: 0.08, ease: "power2.out" },
            "-=0.35"
          );
        }
        registerForViewportReplay(directTl, mobileDirectContainer);
      }

      // 5. Mobile Safari Experiences Section & Cards + Inner Items (Selector 4: .wsite-background-1 .container)
      const mobileSafariSection = document.querySelector(".wsite-background-1 .container");
      if (mobileSafariSection) {
        const safariHeadings = gsap.utils.toArray(mobileSafariSection.querySelectorAll("h2.wsite-content-title"));
        if (safariHeadings.length > 0) {
          const hTl = gsap.fromTo(
            safariHeadings,
            { y: 22, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.55,
              stagger: 0.09,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: mobileSafariSection,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(hTl, mobileSafariSection);
        }
        const mSafariCards = gsap.utils.toArray(mobileSafariSection.querySelectorAll(".home-safari-card"));
        mSafariCards.forEach((card) => {
          const img = card.querySelector(".wsite-image img");
          const innerEls = gsap.utils.toArray(
            card.querySelectorAll(".home-safari-title, .home-safari-description, .wsite-button")
          );
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          tl.fromTo(
            card,
            { y: 28, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
          );
          if (img) {
            tl.fromTo(
              img,
              { scale: 1.15 },
              { scale: 1, duration: 0.6, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (innerEls.length > 0) {
            tl.fromTo(
              innerEls,
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(tl, card);
        });
      }

      // 6. Mobile Yala Spotlight & Wildlife Section + Inner Items (Selector 5: .home-wildlife-section .container)
      const mobileWildlifeContainer = document.querySelector(".home-wildlife-section .container");
      if (mobileWildlifeContainer) {
        const yalaFeature = mobileWildlifeContainer.querySelector(".home-yala-feature");
        if (yalaFeature) {
          const yalaImg = yalaFeature.querySelector(".wsite-image img");
          const yalaItems = gsap.utils.toArray(
            yalaFeature.querySelectorAll(".home-yala-copy .paragraph, .home-yala-copy .wsite-button")
          );
          const yalaTl = gsap.timeline({
            scrollTrigger: {
              trigger: yalaFeature,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          yalaTl.fromTo(
            yalaFeature,
            { y: 28, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
          );
          if (yalaImg) {
            yalaTl.fromTo(
              yalaImg,
              { scale: 1.14 },
              { scale: 1, duration: 0.6, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (yalaItems.length > 0) {
            yalaTl.fromTo(
              yalaItems,
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(yalaTl, yalaFeature);
        }

        const mWildlifeCards = gsap.utils.toArray(mobileWildlifeContainer.querySelectorAll(".home-wildlife-card"));
        mWildlifeCards.forEach((wCard) => {
          const wImg = wCard.querySelector("img");
          const wItems = gsap.utils.toArray(wCard.querySelectorAll(".paragraph, .wildlife-card-links a"));
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: wCard,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          tl.fromTo(
            wCard,
            { y: 26, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
          );
          if (wImg) {
            tl.fromTo(
              wImg,
              { scale: 1.15 },
              { scale: 1, duration: 0.6, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (wItems.length > 0) {
            tl.fromTo(
              wItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.06, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(tl, wCard);
        });
      }

      // 7. Mobile Hambantota Port Section & Cards + Inner Items (Selector 6: .home-port-section .home-port-grid)
      const mobilePortContainer = document.querySelector(".home-port-section .container");
      if (mobilePortContainer) {
        const portIntroEls = gsap.utils.toArray(
          mobilePortContainer.querySelectorAll(
            ":scope > .wsite-section-elements > .paragraph, :scope > .wsite-section-elements > h2.wsite-content-title"
          )
        );
        if (portIntroEls.length > 0) {
          const pIntroTl = gsap.fromTo(
            portIntroEls,
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: mobilePortContainer,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(pIntroTl, mobilePortContainer);
        }

        const mPortCards = gsap.utils.toArray(mobilePortContainer.querySelectorAll(".home-port-card"));
        mPortCards.forEach((pCard) => {
          const pImg = pCard.querySelector(".wsite-image img");
          const pItems = gsap.utils.toArray(
            pCard.querySelectorAll(".home-port-copy .paragraph, .home-port-copy .wsite-button")
          );
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: pCard,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          tl.fromTo(
            pCard,
            { y: 26, scale: 0.96, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }
          );
          if (pImg) {
            tl.fromTo(
              pImg,
              { scale: 1.15 },
              { scale: 1, duration: 0.6, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (pItems.length > 0) {
            tl.fromTo(
              pItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.07, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(tl, pCard);
        });
      }

      // 8. Remaining Mobile Section Headings across all pages
      const mobileHeadings = gsap.utils.toArray(
        "#wsite-content h2.wsite-content-title, #wsite-content .home-wildlife-heading"
      );
      mobileHeadings.forEach((h) => {
        if (
          h.closest(".wsite-background-75") ||
          h.closest(".wsite-background-1") ||
          h.closest(".home-port-section")
        ) {
          return;
        }
        const t = gsap.fromTo(
          h,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: h,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
        registerForViewportReplay(t, h);
      });

      // 9. Remaining Mobile Individual Cards & Feature Blocks
      const mobileCardSelectors = [
        ".janaka-benefits .benefit-column",
        ".home-why-choose .wsite-image",
        ".home-why-choose .why-row .paragraph",
        ".home-meet-janaka .wsite-multicol-col",
        ".home-guest-reviews .wsite-multicol-col",
        ".wsite-background-84 .wsite-multicol-col",
        ".parks-overview-card",
        ".about-intro .wsite-multicol-col",
        ".about-journey .wsite-multicol-col",
        ".about-explore .wsite-image",
        ".wsite-background-11 .wsite-multicol-col",
        ".wsite-background-17 .wsite-multicol-col",
        ".wsite-background-12 .wsite-multicol-col",
        ".wsite-background-15 .wsite-multicol-col",
        ".wsite-background-20 .wsite-multicol-col",
        ".wsite-background-29 .wsite-multicol-col",
        ".wsite-background-37 .wsite-multicol-col",
        ".wsite-background-44 .wsite-multicol-col",
        ".wsite-background-51 .wsite-multicol-col",
        ".udawalawe-wildlife .wsite-multicol-col",
        ".bundala-wildlife .wsite-multicol-col",
        ".wilpattu-wildlife .wsite-multicol-col",
        ".minneriya-wildlife .wsite-multicol-col",
        ".kumana-wildlife .wsite-multicol-col",
        ".udawalawe-info .wsite-multicol-col",
        ".bundala-info .wsite-multicol-col",
        ".wilpattu-info .wsite-multicol-col",
        ".minneriya-info .wsite-multicol-col",
        ".kumana-info .wsite-multicol-col",
        ".port-safari-card",
        ".udawalawe-port-card",
        ".bundala-port-card",
        ".reviews-widget",
        ".janaka-gyg-card",
        ".imageGallery .galleryImageHolder",
        ".footer-wrap .wsite-multicol-col",
      ];

      const mobileCards = gsap.utils.toArray(mobileCardSelectors.join(", "));
      mobileCards.forEach((card) => {
        const t = gsap.fromTo(
          card,
          { y: 22, scale: 0.97, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 93%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
        registerForViewportReplay(t, card);
      });

      animateFirebaseSectionGallery();
    });

    // ============================================================================
    // B. DESKTOP & TABLET GSAP PROFILE (min-width: 768px)
    // ============================================================================
    mm.add("(min-width: 768px)", () => {
      const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      function bindGsap3DHover(elements, maxTilt = 7, liftY = -8, hoverScale = 1.03) {
        if (!hasFinePointer) return;
        gsap.utils.toArray(elements).forEach((el) => {
          if (!(el instanceof HTMLElement)) return;
          el.style.transformStyle = "preserve-3d";
          el.addEventListener("mousemove", (e) => {
            const rect = el.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width - 0.5;
            const relY = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(el, {
              rotateY: relX * maxTilt * 2,
              rotateX: -relY * maxTilt * 2,
              y: liftY,
              scale: hoverScale,
              transformPerspective: 900,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          });
          el.addEventListener("mouseleave", () => {
            gsap.to(el, {
              rotateY: 0,
              rotateX: 0,
              y: 0,
              scale: 1,
              transformPerspective: 900,
              duration: 0.65,
              ease: "elastic.out(1, 0.5)",
              overwrite: "auto",
            });
          });
        });
      }

      function bindGsapButtonHover(selector) {
        if (!hasFinePointer) return;
        gsap.utils.toArray(selector).forEach((btn) => {
          if (!(btn instanceof HTMLElement)) return;
          btn.addEventListener("mouseenter", () => {
            gsap.to(btn, {
              scale: 1.06,
              y: -3,
              duration: 0.35,
              ease: "back.out(2.2)",
              overwrite: "auto",
            });
          });
          btn.addEventListener("mouseleave", () => {
            gsap.to(btn, {
              scale: 1,
              y: 0,
              duration: 0.55,
              ease: "elastic.out(1, 0.5)",
              overwrite: "auto",
            });
          });
        });
      }

      bindGsapButtonHover(".wsite-button, .nav-contact-btn");

      // 1. HEADER & NAVIGATION
      const headerLogo = document.querySelector(".dusk-header .logo");
      const navItems = gsap.utils.toArray(".dusk-header .desktop-nav-center .wsite-menu-item-wrap");
      const contactBtn = document.querySelector(".dusk-header .header-action-contact .nav-contact-btn");

      const headerTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (headerLogo) {
        headerTl.fromTo(
          headerLogo,
          { x: -60, autoAlpha: 0, rotate: -6, scale: 0.85 },
          { x: 0, autoAlpha: 1, rotate: 0, scale: 1, duration: 0.95, ease: "back.out(1.7)" }
        );
      }
      if (navItems.length > 0) {
        headerTl.fromTo(
          navItems,
          { y: -32, autoAlpha: 0, rotateX: -45, transformPerspective: 800 },
          { y: 0, autoAlpha: 1, rotateX: 0, transformPerspective: 800, duration: 0.75, stagger: 0.08, ease: "back.out(1.8)" },
          "-=0.65"
        );
      }
      if (contactBtn) {
        headerTl.fromTo(
          contactBtn,
          { x: 50, autoAlpha: 0, scale: 0.75 },
          { x: 0, autoAlpha: 1, scale: 1, duration: 0.85, ease: "elastic.out(1, 0.55)" },
          "-=0.55"
        );
      }

      // 2. HERO BANNER & ITEMS
      if (!document.body.classList.contains("janaka-contact")) {
        const heroSectionContent = document.querySelector(".banner-wrap .wsite-header-section .wsite-section-content");
        const heroContainer = document.querySelector(".banner-wrap .wsite-header-section .container");
        const heroKicker = document.querySelector(".banner .hero-editorial-kicker");
        const heroTitle = document.querySelector(".banner h2.wsite-content-title");
        const heroHighlight = document.querySelector(".banner .sri-lanka-tracks");
        const heroParagraphs = gsap.utils.toArray(".banner .paragraph");
        const heroBtn = document.querySelector(".banner .wsite-button");
        const heroBg = document.querySelector(".banner-wrap .wsite-header-section");
        const isHome = document.body.classList.contains("wsite-page-index");
        const isFullDesktop = window.innerWidth >= 921;
        const contentCounterScale = isFullDesktop ? (isHome ? 0.81967 : 0.89285) : 1;

        if (heroBg && isFullDesktop) {
          const baseScale = isHome ? 1.22 : 1.12;
          gsap.fromTo(
            heroBg,
            { scale: baseScale + 0.12 },
            { scale: baseScale, duration: 1.9, ease: "power3.out" }
          );
        }

        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: ".banner-wrap",
            start: "top 95%",
            toggleActions: "play none none none",
            once: true,
          },
        });
        if (heroSectionContent) {
          heroTl.fromTo(
            heroSectionContent,
            { autoAlpha: 0, y: 28, scale: contentCounterScale * 0.96 },
            { autoAlpha: 1, y: 0, scale: contentCounterScale, duration: 0.7, ease: "power3.out" }
          );
        }
        if (heroContainer) {
          heroTl.fromTo(
            heroContainer,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.65, ease: "power3.out" },
            "-=0.55"
          );
        }
        if (heroKicker) {
          heroTl.fromTo(
            heroKicker,
            { x: -65, autoAlpha: 0, skewX: -12, scale: 0.9 },
            { x: 0, autoAlpha: 1, skewX: 0, scale: 1, duration: 0.8, ease: "expo.out" },
            "-=0.45"
          );
        }
        if (heroTitle) {
          heroTl.fromTo(
            heroTitle,
            { y: 55, autoAlpha: 0, scale: 0.92, rotateX: 20, transformPerspective: 1000 },
            { y: 0, autoAlpha: 1, scale: 1, rotateX: 0, transformPerspective: 1000, duration: 0.95, ease: "back.out(1.6)" },
            "-=0.5"
          );
        }
        if (heroHighlight) {
          heroTl.fromTo(
            heroHighlight,
            { display: "inline-block", scale: 0.78, rotate: -3 },
            { scale: 1, rotate: 0, duration: 0.9, ease: "elastic.out(1, 0.55)" },
            "-=0.6"
          );
        }
        if (heroParagraphs.length > 0) {
          heroTl.fromTo(
            heroParagraphs,
            { y: 32, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.12, ease: "power3.out" },
            "-=0.55"
          );
        }
        if (heroBtn) {
          heroTl.fromTo(
            heroBtn,
            { y: 36, autoAlpha: 0, scale: 0.8 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.9, ease: "elastic.out(1, 0.55)" },
            "-=0.45"
          );
        }
        registerForViewportReplay(heroTl, document.querySelector(".banner-wrap"));
      }

      // 3. CROSS-SECTION BRIDGE (Selector 1: .hero-cross-bridge-card)
      const crossCard = document.querySelector(".hero-cross-bridge-card");
      if (crossCard) {
        const subLeft = crossCard.querySelector(".cross-sub-left");
        const subCenter = crossCard.querySelector(".cross-sub-center");
        const subRight = crossCard.querySelector(".cross-sub-right");
        const imgGoogle = crossCard.querySelector(".cross-top-google");
        const imgTrip = crossCard.querySelector(".cross-top-tripadvisor");
        const imgTraveler = crossCard.querySelector(".cross-top-traveler");
        const starsEl = crossCard.querySelector(".cross-stars");

        const crossTl = gsap.timeline({
          scrollTrigger: {
            trigger: crossCard,
            start: "top 95%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        crossTl.fromTo(
          crossCard,
          { y: 60, autoAlpha: 0, scale: 0.94, rotateX: 10, transformPerspective: 1100 },
          { y: 0, autoAlpha: 1, scale: 1, rotateX: 0, transformPerspective: 1100, duration: 0.85, ease: "power3.out" }
        );

        if (subLeft) {
          crossTl.fromTo(
            subLeft,
            { x: -60, autoAlpha: 0, rotateY: 25, transformPerspective: 900 },
            { x: 0, autoAlpha: 1, rotateY: 0, transformPerspective: 900, duration: 0.75, ease: "back.out(1.6)" },
            "-=0.5"
          );
        }
        if (subCenter) {
          crossTl.fromTo(
            subCenter,
            { y: 45, autoAlpha: 0, scale: 0.82 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.85, ease: "elastic.out(1, 0.55)" },
            "-=0.6"
          );
        }
        if (subRight) {
          crossTl.fromTo(
            subRight,
            { x: 60, autoAlpha: 0, rotateY: -25, transformPerspective: 900 },
            { x: 0, autoAlpha: 1, rotateY: 0, transformPerspective: 900, duration: 0.75, ease: "back.out(1.6)" },
            "-=0.6"
          );
        }

        if (imgGoogle) {
          crossTl.fromTo(
            imgGoogle,
            { scale: 0, rotate: -140, autoAlpha: 0 },
            { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(2)" },
            "-=0.55"
          );
        }
        if (imgTrip) {
          crossTl.fromTo(
            imgTrip,
            { scale: 0.4, y: -25, autoAlpha: 0 },
            { scale: 1, y: 0, autoAlpha: 1, duration: 0.85, ease: "elastic.out(1, 0.5)" },
            "-=0.65"
          );
        }
        if (imgTraveler) {
          crossTl.fromTo(
            imgTraveler,
            { x: -25, scale: 0.5, rotate: 15, autoAlpha: 0 },
            { x: 0, scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(2)" },
            "-=0.65"
          );
        }
        if (starsEl) {
          crossTl.fromTo(
            starsEl,
            { scale: 0.6, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.65, ease: "back.out(2)" },
            "-=0.45"
          );
        }

        registerForViewportReplay(crossTl, crossCard);
        bindGsap3DHover([subLeft, subCenter, subRight], 5, -5, 1.02);
        initCrossBridgeCounters("play none none none");
      }

      // 4. SECTION: WHY EXPLORE WITH NISHA (Selector 2: .janaka-benefits .container)
      const benefitsSection = document.querySelector(".janaka-benefits");
      if (benefitsSection) {
        const benefitsContainer = benefitsSection.querySelector(".container") || benefitsSection;
        const heading = benefitsSection.querySelector("h2.wsite-content-title");
        const benefitCols = gsap.utils.toArray(benefitsSection.querySelectorAll(".benefit-column"));

        if (heading) {
          const hAnim = gsap.fromTo(
            heading,
            { y: -40, autoAlpha: 0, scale: 0.88, rotateX: 25, transformPerspective: 900 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              rotateX: 0,
              transformPerspective: 900,
              duration: 0.85,
              ease: "back.out(1.7)",
              scrollTrigger: {
                trigger: benefitsContainer,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(hAnim, benefitsContainer);
        }

        const distinctBenefitFromVars = [
          { x: -75, y: 45, rotate: -6, autoAlpha: 0, scale: 0.86 },
          { y: 65, rotateX: 35, transformPerspective: 900, autoAlpha: 0, scale: 0.84 },
          { y: 65, rotateX: -35, transformPerspective: 900, autoAlpha: 0, scale: 0.84 },
          { x: 75, y: 45, rotate: 6, autoAlpha: 0, scale: 0.86 },
        ];

        const benefitsRow = benefitsSection.querySelector(".wsite-multicol-tr") || benefitsContainer;

        benefitCols.forEach((col, i) => {
          const fromVars = distinctBenefitFromVars[i % distinctBenefitFromVars.length];
          const icon = col.querySelector(".benefit-icon");
          const title = col.querySelector(".benefit-title");
          const texts = col.querySelectorAll(".paragraph:not(.benefit-title)");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: benefitsRow,
              start: "top 86%",
              toggleActions: "play none none none",
              once: true,
            },
          });

          tl.fromTo(
            col,
            fromVars,
            {
              x: 0,
              y: 0,
              rotate: 0,
              rotateX: 0,
              transformPerspective: 900,
              autoAlpha: 1,
              scale: 1,
              duration: 0.85,
              delay: i * 0.12,
              ease: "back.out(1.5)",
            }
          );

          if (icon) {
            tl.fromTo(
              icon,
              { scale: 0, rotate: -180 },
              { scale: 1, rotate: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" },
              "-=0.5"
            );
          }
          if (title) {
            tl.fromTo(
              title,
              { y: 20, autoAlpha: 0, scale: 0.92 },
              { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" },
              "-=0.45"
            );
          }
          if (texts.length > 0) {
            tl.fromTo(
              texts,
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: "power2.out" },
              "-=0.35"
            );
          }
          registerForViewportReplay(tl, benefitsRow);
        });

        bindGsap3DHover(benefitCols, 7, -8, 1.03);
      }

      // 5. SECTION: SAVE UP TO 30% DIRECT BOOKING & ITEMS (Selector 3: .wsite-background-75 .container)
      const directSection = document.querySelector(".wsite-background-75");
      if (directSection) {
        const directContainer = directSection.querySelector(".container");
        const title = directSection.querySelector("h2.wsite-content-title");
        const paragraphs = gsap.utils.toArray(
          directSection.querySelectorAll(".paragraph:not(.janaka-payment-label)")
        );
        const ctaBtn = directSection.querySelector(".wsite-button");
        const payLabel = directSection.querySelector(".janaka-payment-label");
        const payCards = gsap.utils.toArray(directSection.querySelectorAll(".janaka-payment-card"));
        const triggerTarget = directContainer || directSection;

        const directTl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerTarget,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        if (directContainer) {
          directTl.fromTo(
            directContainer,
            { y: 55, scale: 0.92, rotateX: 14, transformPerspective: 1000, autoAlpha: 0 },
            { y: 0, scale: 1, rotateX: 0, transformPerspective: 1000, autoAlpha: 1, duration: 0.85, ease: "power3.out" }
          );
          bindGsap3DHover(directContainer, 3, -5, 1.01);
        }
        if (title) {
          directTl.fromTo(
            title,
            { scale: 0.78, autoAlpha: 0, y: 36, rotateX: 22, transformPerspective: 900 },
            { scale: 1, autoAlpha: 1, y: 0, rotateX: 0, transformPerspective: 900, duration: 0.8, ease: "back.out(1.8)" },
            "-=0.55"
          );
        }
        if (paragraphs.length > 0) {
          directTl.fromTo(
            paragraphs,
            { x: (idx) => (idx % 2 === 0 ? -55 : 55), autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.65, stagger: 0.12, ease: "power3.out" },
            "-=0.45"
          );
        }
        if (ctaBtn) {
          directTl.fromTo(
            ctaBtn,
            { scale: 0.68, autoAlpha: 0, y: 24 },
            { scale: 1, autoAlpha: 1, y: 0, duration: 0.85, ease: "elastic.out(1, 0.5)" },
            "-=0.35"
          );
        }
        if (payLabel) {
          directTl.fromTo(
            payLabel,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" },
            "-=0.4"
          );
        }
        if (payCards.length > 0) {
          directTl.fromTo(
            payCards,
            { y: 36, rotate: (idx) => (idx === 0 ? -16 : 16), autoAlpha: 0, scale: 0.7 },
            { y: 0, rotate: 0, autoAlpha: 1, scale: 1, duration: 0.75, stagger: 0.14, ease: "elastic.out(1, 0.55)" },
            "-=0.35"
          );
          bindGsap3DHover(payCards, 8, -5, 1.06);
        }
        registerForViewportReplay(directTl, triggerTarget);
      }

      // 6. SECTION: WHY CHOOSE US (.home-why-choose)
      const whyChooseSection = document.querySelector(".home-why-choose");
      if (whyChooseSection) {
        const featureImg = whyChooseSection.querySelector(".wsite-image img");
        const heading = whyChooseSection.querySelector("h2.wsite-content-title");
        const steps = gsap.utils.toArray(whyChooseSection.querySelectorAll(".why-row .paragraph"));
        const btn = whyChooseSection.querySelector(".wsite-button");

        if (featureImg) {
          const imgAnim = gsap.fromTo(
            featureImg,
            { x: -80, scale: 0.86, rotate: -4, autoAlpha: 0 },
            {
              x: 0,
              scale: 1,
              rotate: 0,
              autoAlpha: 1,
              duration: 1.0,
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: whyChooseSection,
                start: "top 88%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(imgAnim, whyChooseSection);
        }

        const rightTl = gsap.timeline({
          scrollTrigger: {
            trigger: whyChooseSection,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        if (heading) {
          rightTl.fromTo(
            heading,
            { x: 65, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" }
          );
        }
        if (steps.length > 0) {
          const stepAnimations = [
            { x: 70, y: 0, rotateY: -18, transformPerspective: 900 },
            { x: 0, y: 42, scale: 0.88, rotateX: 22, transformPerspective: 900 },
            { x: -55, y: 18, scale: 0.92 },
            { x: 65, y: -32, rotateX: -22, transformPerspective: 900 },
          ];
          steps.forEach((step, idx) => {
            const v = stepAnimations[idx % stepAnimations.length];
            rightTl.fromTo(
              step,
              { ...v, autoAlpha: 0 },
              {
                x: 0,
                y: 0,
                scale: 1,
                rotateX: 0,
                rotateY: 0,
                transformPerspective: 900,
                autoAlpha: 1,
                duration: 0.65,
                ease: "back.out(1.5)",
              },
              "-=0.4"
            );
          });
          bindGsap3DHover(steps, 4, -4, 1.02);
        }
        if (btn) {
          rightTl.fromTo(
            btn,
            { y: 30, autoAlpha: 0, scale: 0.8 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.75, ease: "elastic.out(1, 0.55)" },
            "-=0.3"
          );
        }
        registerForViewportReplay(rightTl, whyChooseSection);
      }

      // 7. SECTION: 6 SAFARI EXPERIENCES GRID & ITEMS (Selector 4: .wsite-background-1 .container)
      const safariSection = document.querySelector(".wsite-background-1 .container");
      const safariCards = gsap.utils.toArray(".home-safari-card");
      if (safariCards.length > 0) {
        const safariHeaders = gsap.utils.toArray(".wsite-background-1 h2.wsite-content-title");
        const headerTarget = safariSection || document.querySelector(".wsite-background-1");
        if (safariHeaders.length > 0 && headerTarget) {
          const hTl = gsap.timeline({
            scrollTrigger: {
              trigger: headerTarget,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          hTl.fromTo(
            safariHeaders,
            { y: 42, autoAlpha: 0, scale: 0.9, rotateX: 20, transformPerspective: 900 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              rotateX: 0,
              transformPerspective: 900,
              duration: 0.8,
              stagger: 0.14,
              ease: "back.out(1.6)",
            }
          );
          registerForViewportReplay(hTl, headerTarget);
        }

        const distinctCardVectors = [
          { x: -75, y: 50, rotate: -5, scale: 0.88, transformPerspective: 1000 },
          { x: 0, y: 80, scale: 0.84, rotateX: 30, transformPerspective: 1000 },
          { x: 75, y: 50, rotate: 5, scale: 0.88, transformPerspective: 1000 },
          { x: -70, y: 45, rotateY: 28, scale: 0.88, transformPerspective: 1000 },
          { x: 0, y: 70, scale: 0.82, rotate: 4, transformPerspective: 1000 },
          { x: 70, y: 45, rotateY: -28, scale: 0.88, transformPerspective: 1000 },
        ];

        safariCards.forEach((card, i) => {
          const vec = distinctCardVectors[i % distinctCardVectors.length];
          const img = card.querySelector(".wsite-image img");
          const title = card.querySelector(".home-safari-title");
          const desc = card.querySelector(".home-safari-description");
          const btn = card.querySelector(".wsite-button");

          const cardTl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true,
            },
          });

          cardTl.fromTo(
            card,
            { ...vec, autoAlpha: 0 },
            {
              x: 0,
              y: 0,
              rotate: 0,
              rotateX: 0,
              rotateY: 0,
              scale: 1,
              transformPerspective: 1000,
              autoAlpha: 1,
              duration: 0.85,
              delay: (i % 3) * 0.08,
              ease: "back.out(1.4)",
            }
          );

          if (img) {
            cardTl.fromTo(
              img,
              { scale: 1.25 },
              { scale: 1, duration: 0.9, ease: "power2.out" },
              "-=0.7"
            );
          }
          if (title) {
            cardTl.fromTo(
              title,
              { x: -24, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.7)" },
              "-=0.55"
            );
          }
          if (desc) {
            cardTl.fromTo(
              desc,
              { y: 18, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out" },
              "-=0.4"
            );
          }
          if (btn) {
            cardTl.fromTo(
              btn,
              { scale: 0.8, autoAlpha: 0 },
              { scale: 1, autoAlpha: 1, duration: 0.6, ease: "elastic.out(1, 0.55)" },
              "-=0.35"
            );
          }
          registerForViewportReplay(cardTl, card);
        });

        bindGsap3DHover(safariCards, 5, -8, 1.025);
      }

      // 8. SECTION: YALA SPOTLIGHT & WILDLIFE ENCOUNTERS + ITEMS (Selector 5: .home-wildlife-section .container)
      const wildlifeSection = document.querySelector(".home-wildlife-section");
      const yalaFeature = document.querySelector(".home-yala-feature");
      if (yalaFeature) {
        const yalaImg = yalaFeature.querySelector(".wsite-image img");
        const yalaCopyItems = gsap.utils.toArray(
          yalaFeature.querySelectorAll(".home-yala-copy .paragraph, .home-yala-copy .wsite-button")
        );

        const yalaTl = gsap.timeline({
          scrollTrigger: {
            trigger: yalaFeature,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        yalaTl.fromTo(
          yalaFeature,
          { scale: 0.9, autoAlpha: 0, y: 55, rotateX: 14, transformPerspective: 1000 },
          { scale: 1, autoAlpha: 1, y: 0, rotateX: 0, transformPerspective: 1000, duration: 0.9, ease: "expo.out" }
        );
        if (yalaImg) {
          yalaTl.fromTo(
            yalaImg,
            { x: -60, scale: 1.15, rotate: -3, autoAlpha: 0 },
            { x: 0, scale: 1, rotate: 0, autoAlpha: 1, duration: 0.85, ease: "back.out(1.5)" },
            "-=0.55"
          );
        }
        if (yalaCopyItems.length > 0) {
          yalaTl.fromTo(
            yalaCopyItems,
            { x: 50, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.65, stagger: 0.1, ease: "back.out(1.5)" },
            "-=0.6"
          );
        }
        registerForViewportReplay(yalaTl, yalaFeature);
        bindGsap3DHover(yalaFeature, 3, -5, 1.01);
      }

      if (wildlifeSection) {
        const wildlifeDivider = wildlifeSection.querySelector("hr.styled-hr");
        const wildlifeHeading = wildlifeSection.querySelector(".home-wildlife-heading");
        const wildlifeFooterNote = wildlifeSection.querySelector(
          ".wsite-section-elements > .paragraph:last-of-type"
        );

        if (wildlifeDivider) {
          const dAnim = gsap.fromTo(
            wildlifeDivider,
            { scaleX: 0, autoAlpha: 0 },
            {
              scaleX: 1,
              autoAlpha: 1,
              duration: 0.8,
              ease: "expo.out",
              scrollTrigger: {
                trigger: wildlifeDivider,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(dAnim, wildlifeDivider);
        }
        if (wildlifeHeading) {
          const whAnim = gsap.fromTo(
            wildlifeHeading,
            { y: 34, autoAlpha: 0, scale: 0.92 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.75,
              ease: "back.out(1.7)",
              scrollTrigger: {
                trigger: wildlifeHeading,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(whAnim, wildlifeHeading);
        }
        if (wildlifeFooterNote) {
          const wfAnim = gsap.fromTo(
            wildlifeFooterNote,
            { y: 24, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.65,
              ease: "power2.out",
              scrollTrigger: {
                trigger: wildlifeFooterNote,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(wfAnim, wildlifeFooterNote);
        }
      }

      const wildlifeCards = gsap.utils.toArray(".home-wildlife-card");
      if (wildlifeCards.length > 0) {
        const wildlifeVectors = [
          { x: -70, rotate: -4, scale: 0.88, transformPerspective: 900 },
          { y: 70, scale: 0.86, rotateX: 30, transformPerspective: 900 },
          { y: 65, scale: 0.86, rotateX: -28, transformPerspective: 900 },
          { x: 70, rotate: 4, scale: 0.88, transformPerspective: 900 },
        ];
        wildlifeCards.forEach((wCard, idx) => {
          const wVec = wildlifeVectors[idx % wildlifeVectors.length];
          const wImg = wCard.querySelector("img");
          const wTitle = wCard.querySelector(".wildlife-card-title");
          const wDesc = wCard.querySelector(".paragraph:not(.wildlife-card-title):not(.wildlife-card-links)");
          const wLinks = gsap.utils.toArray(wCard.querySelectorAll(".wildlife-card-links a"));

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: wCard,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true,
            },
          });
          tl.fromTo(
            wCard,
            { ...wVec, autoAlpha: 0 },
            {
              x: 0,
              y: 0,
              rotate: 0,
              rotateX: 0,
              scale: 1,
              transformPerspective: 900,
              autoAlpha: 1,
              duration: 0.8,
              delay: (idx % 2) * 0.08,
              ease: "back.out(1.5)",
            }
          );
          if (wImg) {
            tl.fromTo(wImg, { scale: 1.22 }, { scale: 1, duration: 0.85, ease: "power2.out" }, "-=0.6");
          }
          if (wTitle) {
            tl.fromTo(
              wTitle,
              { x: 24, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" },
              "-=0.5"
            );
          }
          if (wDesc) {
            tl.fromTo(
              wDesc,
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.45, ease: "power2.out" },
              "-=0.38"
            );
          }
          if (wLinks.length > 0) {
            tl.fromTo(
              wLinks,
              { y: 12, scale: 0.86, autoAlpha: 0 },
              { y: 0, scale: 1, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: "back.out(1.8)" },
              "-=0.32"
            );
          }
          registerForViewportReplay(tl, wCard);
        });
        bindGsap3DHover(wildlifeCards, 5, -7, 1.025);
      }

      // 9. SECTION: MEET NISHA & THE TEAM (.home-meet-janaka)
      const meetSection = document.querySelector(".home-meet-janaka");
      if (meetSection) {
        const meetImg = meetSection.querySelector(".wsite-image img");
        const meetHeading = meetSection.querySelector("h2.wsite-content-title");
        const meetParas = gsap.utils.toArray(meetSection.querySelectorAll(".paragraph"));
        const meetBtn = meetSection.querySelector(".wsite-button");

        const meetTl = gsap.timeline({
          scrollTrigger: {
            trigger: meetSection,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        if (meetImg) {
          meetTl.fromTo(
            meetImg,
            { x: -70, rotate: -5, scale: 0.88, autoAlpha: 0 },
            { x: 0, rotate: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: "back.out(1.5)" }
          );
        }
        if (meetHeading) {
          meetTl.fromTo(
            meetHeading,
            { y: -35, autoAlpha: 0, scale: 0.92 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" },
            "-=0.6"
          );
        }
        if (meetParas.length > 0) {
          meetTl.fromTo(
            meetParas,
            { x: 55, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.65, stagger: 0.12, ease: "power3.out" },
            "-=0.45"
          );
        }
        if (meetBtn) {
          meetTl.fromTo(
            meetBtn,
            { scale: 0.75, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.75, ease: "elastic.out(1, 0.55)" },
            "-=0.35"
          );
        }
        registerForViewportReplay(meetTl, meetSection);
      }

      // 10. SECTION: GUEST REVIEWS (.home-guest-reviews)
      const reviewsSection = document.querySelector(".home-guest-reviews");
      if (reviewsSection) {
        const revHeading = reviewsSection.querySelector("h2.wsite-content-title");
        const revAward = reviewsSection.querySelector(".home-review-award");
        const revSummary = reviewsSection.querySelector(".home-review-summary");
        const revListItems = gsap.utils.toArray(reviewsSection.querySelectorAll(".home-review-summary ul li"));
        const googleBtn = reviewsSection.querySelector(".guest-google-button .wsite-button");

        const revTl = gsap.timeline({
          scrollTrigger: {
            trigger: reviewsSection,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true,
          },
        });

        if (revHeading) {
          revTl.fromTo(
            revHeading,
            { y: 36, autoAlpha: 0, scale: 0.92 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.75, ease: "back.out(1.6)" }
          );
        }
        if (revAward) {
          revTl.fromTo(
            revAward,
            { x: -65, rotateY: -25, transformPerspective: 900, autoAlpha: 0, scale: 0.88 },
            { x: 0, rotateY: 0, transformPerspective: 900, autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(1.6)" },
            "-=0.4"
          );
        }
        if (revSummary) {
          revTl.fromTo(
            revSummary,
            { x: 65, rotateY: 25, transformPerspective: 900, autoAlpha: 0, scale: 0.9 },
            { x: 0, rotateY: 0, transformPerspective: 900, autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(1.6)" },
            "-=0.6"
          );
        }
        if (revListItems.length > 0) {
          revTl.fromTo(
            revListItems,
            { x: 30, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.5)" },
            "-=0.4"
          );
        }
        if (googleBtn) {
          revTl.fromTo(
            googleBtn,
            { y: 28, autoAlpha: 0, scale: 0.8 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "elastic.out(1, 0.55)" },
            "-=0.3"
          );
        }
        registerForViewportReplay(revTl, reviewsSection);
        bindGsap3DHover([revAward, revSummary], 5, -5, 1.02);
      }

      // 11. SECTION: HAMBANTOTA PORT SAFARIS & ITEMS (Selector 6: .home-port-section .home-port-grid)
      const portSection = document.querySelector(".home-port-section");
      if (portSection) {
        const portContainer = portSection.querySelector(".container");
        const portIntroHeaderEls = gsap.utils.toArray(
          portSection.querySelectorAll(
            ".container > .wsite-section-elements > .paragraph, .container > .wsite-section-elements > h2.wsite-content-title"
          )
        );
        const portCards = gsap.utils.toArray(portSection.querySelectorAll(".home-port-card"));
        const portTarget = portContainer || portSection;

        if (portIntroHeaderEls.length > 0) {
          const pIntroAnim = gsap.fromTo(
            portIntroHeaderEls,
            { y: 36, autoAlpha: 0, scale: 0.93 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.75,
              stagger: 0.12,
              ease: "back.out(1.6)",
              scrollTrigger: {
                trigger: portTarget,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(pIntroAnim, portTarget);
        }

        const portVectors = [
          { x: -65, y: 40, rotate: -4, scale: 0.88, transformPerspective: 900 },
          { x: 0, y: 65, scale: 0.85, rotateX: 25, transformPerspective: 900 },
          { x: 65, y: 40, rotate: 4, scale: 0.88, transformPerspective: 900 },
        ];
        portCards.forEach((pCard, i) => {
          const v = portVectors[i % portVectors.length];
          const pImg = pCard.querySelector(".wsite-image img");
          const pTitle = pCard.querySelector(".home-port-copy .paragraph");
          const pBtn = pCard.querySelector(".home-port-copy .wsite-button");

          const pTl = gsap.timeline({
            scrollTrigger: {
              trigger: pCard,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true,
            },
          });

          pTl.fromTo(
            pCard,
            { ...v, autoAlpha: 0 },
            {
              x: 0,
              y: 0,
              rotate: 0,
              rotateX: 0,
              scale: 1,
              transformPerspective: 900,
              autoAlpha: 1,
              duration: 0.82,
              delay: i * 0.1,
              ease: "back.out(1.5)",
            }
          );

          if (pImg) {
            pTl.fromTo(
              pImg,
              { scale: 1.24 },
              { scale: 1, duration: 0.88, ease: "power2.out" },
              "-=0.65"
            );
          }
          if (pTitle) {
            pTl.fromTo(
              pTitle,
              { y: 18, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.6)" },
              "-=0.5"
            );
          }
          if (pBtn) {
            pTl.fromTo(
              pBtn,
              { scale: 0.8, y: 14, autoAlpha: 0 },
              { scale: 1, y: 0, autoAlpha: 1, duration: 0.65, ease: "elastic.out(1, 0.55)" },
              "-=0.38"
            );
          }
          registerForViewportReplay(pTl, pCard);
        });
        bindGsap3DHover(portCards, 5, -7, 1.025);
      }

      // 12. SECTION: TRANSFERS & STAYS (.wsite-background-84)
      const transfersSection = document.querySelector(".wsite-background-84");
      if (transfersSection) {
        const cols = gsap.utils.toArray(transfersSection.querySelectorAll(".wsite-multicol-col"));
        const colMotions = [
          { x: -65, rotateY: 22, transformPerspective: 900, autoAlpha: 0, scale: 0.88 },
          { y: 65, scale: 0.85, rotateX: 22, transformPerspective: 900, autoAlpha: 0 },
          { x: 65, rotateY: -22, transformPerspective: 900, autoAlpha: 0, scale: 0.88 },
        ];
        cols.forEach((col, i) => {
          const t = gsap.fromTo(
            col,
            colMotions[i % colMotions.length],
            {
              x: 0,
              y: 0,
              rotateX: 0,
              rotateY: 0,
              transformPerspective: 900,
              scale: 1,
              autoAlpha: 1,
              duration: 0.85,
              delay: i * 0.12,
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: col,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(t, col);
        });
        bindGsap3DHover(cols, 5, -6, 1.02);
      }

      // 13. INNER PAGES — Per-Card & Per-Element Desktop Triggers
      if (!document.querySelector(".janaka-benefits")) {
        const innerHeadings = gsap.utils.toArray(".wsite-body-section h2.wsite-content-title");
        innerHeadings.forEach((h) => {
          const t = gsap.fromTo(
            h,
            { y: 35, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.75,
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: h,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(t, h);
        });

        const innerCards = gsap.utils.toArray(
          ".parks-overview-card, .wsite-body-section .wsite-multicol-col, .port-safari-card, .udawalawe-port-card, .bundala-port-card, .reviews-widget, .janaka-gyg, .imageGallery .galleryImageHolder, body.janaka-contact .contact-cards > .wsite-multicol-table-wrap > .wsite-multicol-table > .wsite-multicol-tbody > .wsite-multicol-tr > .wsite-multicol-col"
        );
        innerCards.forEach((card, i) => {
          const t = gsap.fromTo(
            card,
            { y: 40, scale: 0.94, autoAlpha: 0 },
            {
              y: 0,
              scale: 1,
              autoAlpha: 1,
              duration: 0.75,
              delay: (i % 3) * 0.08,
              ease: "back.out(1.4)",
              scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
          registerForViewportReplay(t, card);
        });
      }

      // 14. FOOTER — Staggered 3-Column Entrance
      const footerWrap = document.querySelector(".footer-wrap");
      if (footerWrap) {
        const footerCols = gsap.utils.toArray(footerWrap.querySelectorAll(".wsite-multicol-col"));
        const fAnim = gsap.fromTo(
          footerCols,
          { y: 40, autoAlpha: 0, scale: 0.94 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.75,
            stagger: 0.14,
            ease: "back.out(1.5)",
            scrollTrigger: {
              trigger: footerWrap,
              start: "top 92%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
        registerForViewportReplay(fAnim, footerWrap);
      }

      // 15. FIREBASE LIVE SECTION GALLERY (Selector 5: #firebase-section-gallery > #firebase-section-grid)
      animateFirebaseSectionGallery();
    });

    // Ensure ScrollTrigger recalculates and visibly replays any section currently in the viewport
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      replayVisibleAnimations();
    });
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);
    window.addEventListener("load", () => {
      ScrollTrigger.refresh();
    });
  }

  bindEditableSlots();
  bindEditableTextSlots();
  applyEditModeState();
  initUltraSmoothScroll();
  void initDistinctGsapAnimations();
  void hydrateFromFirebaseCms().then(() => {
    if (typeof window.__animateFirebaseSectionGallery === "function") {
      window.__animateFirebaseSectionGallery();
    }
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });
})();
