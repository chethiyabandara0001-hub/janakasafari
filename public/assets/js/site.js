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
        "Hello Janaka,",
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
        emailBtn.href = `mailto:safarijanaka@gmail.com?subject=${subject}&body=${encodedBody}`;
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
  const pathname = window.location.pathname;
  const currentPageFile =
    pathname === "/" || pathname === ""
      ? "index.html"
      : pathname.replace(/^\/+/, "") || "index.html";
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
        <a href="/admin" class="admin-dock-btn">Open Firebase Studio</a>
        <div style="display:flex;gap:8px;">
          <button type="button" class="admin-dock-btn" id="admin-cancel-btn">Cancel</button>
          <button type="submit" class="admin-dock-btn is-primary" id="admin-save-btn">Save via Firebase</button>
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

  if (slotForm) {
    slotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeDomSlot) return;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }
      try {
        const scopeInput = slotForm.querySelector('input[name="adminScope"]:checked');
        const scope = scopeInput ? scopeInput.value : "slot";
        const newAlt = altInput ? altInput.value : "";
        const customUrl = urlInput ? urlInput.value.trim() : "";

        let updatedSrc = activeDomSlot.src;

        if (selectedUploadFile) {
          const fd = new FormData();
          fd.append("mode", "update-slot");
          fd.append("page", currentPageFile);
          fd.append("slotIndex", String(activeDomSlot.slotIndex));
          fd.append("scope", scope);
          fd.append("altText", newAlt);
          fd.append("file", selectedUploadFile);

          const res = await fetch("/api/admin/images", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          if (data.updatedSrc) {
            updatedSrc = `${data.updatedSrc.replace(/^\/+/, "")}?v=${Date.now()}`;
          }
        } else {
          const res = await fetch("/api/admin/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update-slot-meta",
              page: currentPageFile,
              slotIndex: activeDomSlot.slotIndex,
              altText: newAlt,
              externalUrl: customUrl || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Update failed");
          if (customUrl) updatedSrc = customUrl;
        }

        if (activeDomSlot.type === "hero-bg") {
          activeDomSlot.element.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${updatedSrc}")`;
        } else {
          activeDomSlot.element.src = updatedSrc;
          activeDomSlot.element.alt = newAlt;
          const parentAnchor = activeDomSlot.element.closest("a[data-lightbox]");
          if (parentAnchor) {
            parentAnchor.href = updatedSrc;
          }
        }
        editorDialog.close();
      } catch (err) {
        console.error(err);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save via Firebase";
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

  // Hydrate page with Firebase CMS state (slot image overrides, section wildlife galleries, text edits, and custom text blocks)
  async function hydrateFromFirebaseCms() {
    try {
      const res = await fetch(`/api/admin/cms?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const cms = await res.json();

      // 1. Apply image slot overrides for this page
      document.querySelectorAll(".wsite-body-section").forEach((sec) => {
        sec.style.backgroundImage = "none";
      });
      if (cms.imageOverrides) {
        Object.values(cms.imageOverrides).forEach((ov) => {
          if (!ov || ov.page !== currentPageFile || !ov.src) return;
          const entry = slotElementMap.get(ov.slotId);
          if (!entry) return;
          if (entry.type === "hero-bg") {
            if (/payment-|visa|mastercard/i.test(ov.src)) return;
            if (entry.element.classList.contains("wsite-body-section")) return;
            entry.element.style.backgroundImage = `url("${ov.src}")`;
            entry.element.style.backgroundSize = "cover";
            entry.element.style.backgroundPosition = "center center";
            entry.element.style.minHeight = "110vh";
            entry.element.style.height = "110vh";
          } else {
            if (entry.element.classList.contains("janaka-brand-logo") || entry.element.closest(".hero-cross-bridge-wrap")) {
              return;
            }
            entry.element.src = ov.src;
            if (ov.alt) entry.element.alt = ov.alt;
            const parentAnchor = entry.element.closest("a[data-lightbox]");
            if (parentAnchor) parentAnchor.href = ov.lightboxHref || ov.src;
          }
        });
      }

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

      // 4. Render Curated Firebase Section Wildlife Gallery for this page
      const pageSectionItems = Array.isArray(cms.sectionGalleryItems)
        ? cms.sectionGalleryItems.filter((item) => item.page === currentPageFile)
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
              <div class="firebase-section-kicker">Firebase Live Section Gallery</div>
              <h2 class="firebase-section-title">${sectionGroupsTitle}</h2>
            </div>
            <a href="/admin" class="admin-dock-btn">Manage Section Photos in Studio</a>
          </div>
          <div class="firebase-section-grid" id="firebase-section-grid"></div>
        `;

        const grid = showcase.querySelector("#firebase-section-grid");
        pageSectionItems.forEach((item) => {
          const card = document.createElement("article");
          card.className = "firebase-section-card";
          card.innerHTML = `
            <div>
              <div class="firebase-section-card-media">
                <img src="${item.src}" alt="${item.alt || item.title}" loading="lazy" />
              </div>
              <div class="firebase-section-card-body">
                <div class="firebase-section-card-tag">${item.sectionTitle}</div>
                <h3 class="firebase-section-card-heading">${item.title}</h3>
                <p class="firebase-section-card-caption">${item.caption || ""}</p>
              </div>
            </div>
            <div class="firebase-section-card-actions">
              <a href="/admin" class="admin-dock-btn is-primary">Edit / Replace in Studio</a>
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let rafId = null;
    let isAnimating = false;
    let lastTime = performance.now();
    const lerpFactor = 0.085; // Silky inertia damping

    function getMaxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function updateScroll(now) {
      const dt = Math.min((now - lastTime) / 16.667, 4);
      lastTime = now;

      const diff = targetY - currentY;
      if (Math.abs(diff) > 0.35) {
        currentY += diff * (1 - Math.pow(1 - lerpFactor, dt));
        window.scrollTo(0, currentY);
        rafId = requestAnimationFrame(updateScroll);
      } else {
        currentY = targetY;
        window.scrollTo(0, targetY);
        isAnimating = false;
        rafId = null;
        document.documentElement.classList.remove("ultra-smooth-active");
      }
    }

    function startAnimation() {
      if (!isAnimating) {
        isAnimating = true;
        lastTime = performance.now();
        document.documentElement.classList.add("ultra-smooth-active");
        rafId = requestAnimationFrame(updateScroll);
      }
    }

    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey || e.defaultPrevented) return;
        if (document.body.style.overflow === "hidden") return;
        const openDialog = document.querySelector("dialog[open]");
        if (openDialog) return;

        // Allow native scrolling inside nested scrollable containers
        let node = e.target;
        while (node && node !== document.body && node !== document.documentElement) {
          if (node instanceof HTMLElement) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
              return;
            }
          }
          node = node.parentNode;
        }

        e.preventDefault();

        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 36;
        else if (e.deltaMode === 2) delta *= window.innerHeight * 0.85;

        if (!isAnimating) {
          currentY = window.scrollY;
          targetY = window.scrollY;
        }

        targetY = Math.max(0, Math.min(getMaxScroll(), targetY + delta));
        startAnimation();
      },
      { passive: false }
    );

    window.addEventListener(
      "scroll",
      () => {
        if (!isAnimating) {
          currentY = window.scrollY;
          targetY = window.scrollY;
        }
      },
      { passive: true }
    );

    window.addEventListener("keydown", (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      if (document.querySelector("dialog[open]")) return;

      let step = 0;
      if (e.key === "ArrowDown") step = 110;
      else if (e.key === "ArrowUp") step = -110;
      else if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) step = window.innerHeight * 0.82;
      else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) step = -window.innerHeight * 0.82;
      else if (e.key === "Home") {
        e.preventDefault();
        if (!isAnimating) currentY = window.scrollY;
        targetY = 0;
        startAnimation();
        return;
      } else if (e.key === "End") {
        e.preventDefault();
        if (!isAnimating) currentY = window.scrollY;
        targetY = getMaxScroll();
        startAnimation();
        return;
      }

      if (step !== 0) {
        e.preventDefault();
        if (!isAnimating) {
          currentY = window.scrollY;
          targetY = window.scrollY;
        }
        targetY = Math.max(0, Math.min(getMaxScroll(), targetY + step));
        startAnimation();
      }
    });

    // Smooth in-page hash anchor navigation
    document.addEventListener("click", (e) => {
      const anchor = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const targetEl = document.querySelector(hash);
      if (targetEl) {
        e.preventDefault();
        if (!isAnimating) currentY = window.scrollY;
        const rect = targetEl.getBoundingClientRect();
        targetY = Math.max(0, Math.min(getMaxScroll(), window.scrollY + rect.top - 24));
        startAnimation();
        history.pushState(null, "", hash);
      }
    });

    window.addEventListener("resize", () => {
      targetY = Math.min(targetY, getMaxScroll());
      if (rafId && !isAnimating) cancelAnimationFrame(rafId);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.head.appendChild(s);
    });
  }

  async function initDistinctGsapAnimations() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (!window.gsap) {
        await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js");
      }
      if (!window.ScrollTrigger) {
        await loadScript("https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js");
      }
    } catch (err) {
      console.warn("GSAP CDN load skipped:", err);
      return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    // Sync ScrollTrigger with ultra-smooth scrolling
    window.addEventListener("scroll", () => ScrollTrigger.update(), { passive: true });

    // 1. HEADER & NAVIGATION — Distinct Entrance Choreography
    const headerLogo = document.querySelector(".dusk-header .logo");
    const navItems = gsap.utils.toArray(".dusk-header .desktop-nav-center .wsite-menu-item-wrap");
    const contactBtn = document.querySelector(".dusk-header .header-action-contact .nav-contact-btn");

    const headerTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (headerLogo) {
      headerTl.fromTo(
        headerLogo,
        { x: -50, opacity: 0, rotate: -6, scale: 0.88 },
        { x: 0, opacity: 1, rotate: 0, scale: 1, duration: 0.9 }
      );
    }
    if (navItems.length > 0) {
      headerTl.fromTo(
        navItems,
        { y: -28, opacity: 0, rotateX: -45 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.65, stagger: 0.08, ease: "back.out(1.7)" },
        "-=0.55"
      );
    }
    if (contactBtn) {
      headerTl.fromTo(
        contactBtn,
        { x: 50, opacity: 0, scale: 0.75 },
        { x: 0, opacity: 1, scale: 1, duration: 0.75, ease: "elastic.out(1, 0.6)" },
        "-=0.45"
      );
    }

    // 2. HERO BANNER — Distinct Item-by-Item Reveal + Scroll Parallax
    const heroKicker = document.querySelector(".banner .hero-editorial-kicker");
    const heroTitle = document.querySelector(".banner h2.wsite-content-title");
    const heroHighlight = document.querySelector(".banner .sri-lanka-tracks");
    const heroParagraphs = gsap.utils.toArray(".banner .paragraph");
    const heroBtn = document.querySelector(".banner .wsite-button");

    const heroTl = gsap.timeline({ delay: 0.15 });
    if (heroKicker) {
      heroTl.fromTo(
        heroKicker,
        { x: -60, opacity: 0, skewX: -12 },
        { x: 0, opacity: 1, skewX: 0, duration: 0.8, ease: "expo.out" }
      );
    }
    if (heroTitle) {
      heroTl.fromTo(
        heroTitle,
        { y: 55, opacity: 0, scale: 0.94, filter: "blur(8px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.0, ease: "power4.out" },
        "-=0.5"
      );
    }
    if (heroHighlight) {
      heroTl.fromTo(
        heroHighlight,
        { scale: 0.85, textShadow: "0 0 0px rgba(245,166,35,0)" },
        { scale: 1, textShadow: "0 0 28px rgba(245,166,35,0.65)", duration: 0.85, ease: "back.out(2)" },
        "-=0.6"
      );
    }
    if (heroParagraphs.length > 0) {
      heroTl.fromTo(
        heroParagraphs,
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.12, ease: "power2.out" },
        "-=0.55"
      );
    }
    if (heroBtn) {
      heroTl.fromTo(
        heroBtn,
        { y: 36, opacity: 0, scale: 0.82 },
        { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "elastic.out(1, 0.55)" },
        "-=0.45"
      );
    }

    const heroBg = document.querySelector(".banner-wrap .wsite-header-section");
    if (heroBg) {
      gsap.to(heroBg, {
        backgroundPositionY: "62%",
        ease: "none",
        scrollTrigger: {
          trigger: ".banner-wrap",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    // 3. CROSS-SECTION BRIDGE — Distinct Animations for Left, Center & Right Sub-Sections + Number Counters
    const crossCard = document.querySelector(".hero-cross-bridge-card");
    if (crossCard) {
      const subLeft = crossCard.querySelector(".cross-sub-left");
      const subCenter = crossCard.querySelector(".cross-sub-center");
      const subRight = crossCard.querySelector(".cross-sub-right");
      const topImgs = crossCard.querySelectorAll(".cross-top-img");

      const crossTl = gsap.timeline({
        scrollTrigger: {
          trigger: crossCard,
          start: "top 92%",
          toggleActions: "play none none reverse",
        },
      });

      crossTl.fromTo(
        crossCard,
        { y: 60, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
      );

      if (subLeft) {
        crossTl.fromTo(
          subLeft,
          { x: -55, opacity: 0, rotateY: 25 },
          { x: 0, opacity: 1, rotateY: 0, duration: 0.75, ease: "back.out(1.5)" },
          "-=0.45"
        );
      }
      if (subCenter) {
        crossTl.fromTo(
          subCenter,
          { y: 45, opacity: 0, scale: 0.82 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.65)" },
          "-=0.55"
        );
      }
      if (subRight) {
        crossTl.fromTo(
          subRight,
          { x: 55, opacity: 0, rotateY: -25 },
          { x: 0, opacity: 1, rotateY: 0, duration: 0.75, ease: "back.out(1.5)" },
          "-=0.6"
        );
      }
      if (topImgs.length > 0) {
        crossTl.fromTo(
          topImgs,
          { scale: 0, rotate: -15, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.7, stagger: 0.14, ease: "back.out(2.2)" },
          "-=0.55"
        );
      }

      // Animated Counter for 4.9 Google Score
      const scoreEl = crossCard.querySelector(".cross-score");
      if (scoreEl) {
        const scoreObj = { val: 0 };
        gsap.to(scoreObj, {
          val: 4.9,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: crossCard,
            start: "top 90%",
          },
          onUpdate: () => {
            scoreEl.textContent = scoreObj.val.toFixed(1);
          },
        });
      }

      // Animated Counter for 12,500+ Happy Explorers
      const metricEl = crossCard.querySelector(".cross-metric");
      if (metricEl) {
        const countObj = { val: 0 };
        gsap.to(countObj, {
          val: 12500,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: crossCard,
            start: "top 90%",
          },
          onUpdate: () => {
            metricEl.textContent = `${Math.round(countObj.val).toLocaleString()}+`;
          },
        });
      }
    }

    // 4. SECTION: WHY EXPLORE WITH JANAKA (.janaka-benefits) — 4 Distinct Card Motions
    const benefitsSection = document.querySelector(".janaka-benefits");
    if (benefitsSection) {
      const heading = benefitsSection.querySelector("h2.wsite-content-title");
      const benefitCols = gsap.utils.toArray(benefitsSection.querySelectorAll(".benefit-column"));

      if (heading) {
        gsap.fromTo(
          heading,
          { y: -40, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.85,
            ease: "back.out(1.7)",
            scrollTrigger: { trigger: benefitsSection, start: "top 82%" },
          }
        );
      }

      const distinctBenefitFromVars = [
        { x: -70, y: 30, rotate: -6, opacity: 0, scale: 0.88 }, // Card 1: swoop from bottom-left
        { y: 75, rotateX: 35, opacity: 0, scale: 0.85 },        // Card 2: 3D flip up from bottom
        { y: -65, rotateX: -35, opacity: 0, scale: 0.85 },      // Card 3: 3D drop from top
        { x: 70, y: 30, rotate: 6, opacity: 0, scale: 0.88 },   // Card 4: swoop from bottom-right
      ];

      benefitCols.forEach((col, i) => {
        const fromVars = distinctBenefitFromVars[i % distinctBenefitFromVars.length];
        const icon = col.querySelector(".benefit-icon");
        const texts = col.querySelectorAll(".paragraph");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: col,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        });

        tl.fromTo(
          col,
          fromVars,
          { x: 0, y: 0, rotate: 0, rotateX: 0, opacity: 1, scale: 1, duration: 0.85, delay: i * 0.1, ease: "expo.out" }
        );

        if (icon) {
          tl.fromTo(
            icon,
            { scale: 0, rotate: -180 },
            { scale: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" },
            "-=0.5"
          );
        }
        if (texts.length > 0) {
          tl.fromTo(
            texts,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
            "-=0.45"
          );
        }
      });
    }

    // 5. SECTION: SAVE UP TO 30% DIRECT BOOKING (.wsite-background-75)
    const directSection = document.querySelector(".wsite-background-75");
    if (directSection) {
      const title = directSection.querySelector("h2.wsite-content-title");
      const paragraphs = gsap.utils.toArray(directSection.querySelectorAll(".paragraph"));
      const ctaBtn = directSection.querySelector(".wsite-button");
      const payCards = gsap.utils.toArray(directSection.querySelectorAll(".janaka-payment-card"));

      const directTl = gsap.timeline({
        scrollTrigger: {
          trigger: directSection,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      if (title) {
        directTl.fromTo(
          title,
          { scale: 0.72, opacity: 0, y: 35 },
          { scale: 1, opacity: 1, y: 0, duration: 0.85, ease: "back.out(1.8)" }
        );
      }
      if (paragraphs.length > 0) {
        directTl.fromTo(
          paragraphs,
          { x: (idx) => (idx % 2 === 0 ? -50 : 50), opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, stagger: 0.14, ease: "power3.out" },
          "-=0.45"
        );
      }
      if (ctaBtn) {
        directTl.fromTo(
          ctaBtn,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1.1, 0.5)" },
          "-=0.35"
        );
      }
      if (payCards.length > 0) {
        directTl.fromTo(
          payCards,
          { y: 30, rotate: (idx) => (idx === 0 ? -12 : 12), opacity: 0, scale: 0.8 },
          { y: 0, rotate: 0, opacity: 1, scale: 1, duration: 0.65, stagger: 0.15, ease: "back.out(2)" },
          "-=0.4"
        );
      }
    }

    // 6. SECTION: WHY CHOOSE US (.home-why-choose) — Split Image Reveal + Staggered Numbered Steps
    const whyChooseSection = document.querySelector(".home-why-choose");
    if (whyChooseSection) {
      const featureImg = whyChooseSection.querySelector(".wsite-image img");
      const heading = whyChooseSection.querySelector("h2.wsite-content-title");
      const steps = gsap.utils.toArray(whyChooseSection.querySelectorAll(".paragraph"));
      const btn = whyChooseSection.querySelector(".wsite-button");

      if (featureImg) {
        gsap.fromTo(
          featureImg,
          { x: -80, scale: 1.15, rotate: -3, opacity: 0, clipPath: "inset(0 100% 0 0)" },
          {
            x: 0,
            scale: 1,
            rotate: 0,
            opacity: 1,
            clipPath: "inset(0 0% 0 0)",
            duration: 1.15,
            ease: "power4.out",
            scrollTrigger: { trigger: whyChooseSection, start: "top 78%" },
          }
        );
      }

      const rightTl = gsap.timeline({
        scrollTrigger: { trigger: whyChooseSection, start: "top 78%", toggleActions: "play none none reverse" },
      });

      if (heading) {
        rightTl.fromTo(
          heading,
          { x: 65, opacity: 0, skewX: 8 },
          { x: 0, opacity: 1, skewX: 0, duration: 0.8, ease: "power3.out" }
        );
      }
      if (steps.length > 0) {
        steps.forEach((step, idx) => {
          const stepAnimations = [
            { x: 60, y: 0, rotateX: 0 },
            { x: 0, y: 40, scale: 0.92 },
            { x: 75, y: 15, skewX: -6 },
            { x: 0, y: -35, rotateX: -25 },
          ];
          const v = stepAnimations[idx % stepAnimations.length];
          rightTl.fromTo(
            step,
            { ...v, opacity: 0 },
            { x: 0, y: 0, scale: 1, skewX: 0, rotateX: 0, opacity: 1, duration: 0.65, ease: "back.out(1.4)" },
            "-=0.45"
          );
        });
      }
      if (btn) {
        rightTl.fromTo(
          btn,
          { y: 28, opacity: 0, scale: 0.85 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "elastic.out(1, 0.6)" },
          "-=0.3"
        );
      }
    }

    // 7. SECTION: 6 SAFARI EXPERIENCES GRID (.home-safari-grid) — Distinct Trajectory Per Park Card
    const safariCards = gsap.utils.toArray(".home-safari-card");
    if (safariCards.length > 0) {
      const safariHeaders = gsap.utils.toArray(".wsite-background-1 h2.wsite-content-title");
      if (safariHeaders.length > 0) {
        gsap.fromTo(
          safariHeaders,
          { y: 38, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: { trigger: ".wsite-background-1", start: "top 82%" },
          }
        );
      }

      const distinctCardVectors = [
        { x: -80, y: 45, rotate: -5, scale: 0.9 },     // 1. Yala: diagonal from bottom-left
        { x: 0, y: 85, scale: 0.82, rotateX: 25 },     // 2. Udawalawe: 3D rise from bottom
        { x: 80, y: 45, rotate: 5, scale: 0.9 },       // 3. Bundala: diagonal from bottom-right
        { x: -75, y: -35, rotateY: 30, scale: 0.88 },  // 4. Wilpattu: 3D hinge from top-left
        { x: 0, y: -70, scale: 0.78, rotate: 3 },      // 5. Minneriya: zoom-drop from center
        { x: 75, y: -35, rotateY: -30, scale: 0.88 },  // 6. Kumana: 3D hinge from top-right
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
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        });

        cardTl.fromTo(
          card,
          { ...vec, opacity: 0 },
          { x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1, duration: 0.85, ease: "power3.out" }
        );

        if (img) {
          cardTl.fromTo(
            img,
            { scale: 1.28, filter: "brightness(0.6)" },
            { scale: 1, filter: "brightness(1)", duration: 0.95, ease: "power2.out" },
            "-=0.7"
          );
        }
        if (title) {
          cardTl.fromTo(title, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }, "-=0.55");
        }
        if (desc) {
          cardTl.fromTo(desc, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.4");
        }
        if (btn) {
          cardTl.fromTo(btn, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2)" }, "-=0.35");
        }
      });
    }

    // 8. SECTION: YALA SPOTLIGHT & WILDLIFE ENCOUNTERS (.home-wildlife-section)
    const yalaFeature = document.querySelector(".home-yala-feature");
    if (yalaFeature) {
      const yalaImg = yalaFeature.querySelector(".wsite-image img");
      const yalaCopyItems = gsap.utils.toArray(yalaFeature.querySelectorAll(".home-yala-copy .paragraph, .home-yala-copy .wsite-button"));

      const yalaTl = gsap.timeline({
        scrollTrigger: { trigger: yalaFeature, start: "top 82%", toggleActions: "play none none reverse" },
      });

      yalaTl.fromTo(
        yalaFeature,
        { scale: 0.92, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.85, ease: "expo.out" }
      );
      if (yalaImg) {
        yalaTl.fromTo(
          yalaImg,
          { x: -55, scale: 1.15, opacity: 0 },
          { x: 0, scale: 1, opacity: 1, duration: 0.85, ease: "power3.out" },
          "-=0.55"
        );
      }
      if (yalaCopyItems.length > 0) {
        yalaTl.fromTo(
          yalaCopyItems,
          { x: 45, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.65, stagger: 0.12, ease: "back.out(1.4)" },
          "-=0.6"
        );
      }
    }

    const wildlifeCards = gsap.utils.toArray(".home-wildlife-card");
    if (wildlifeCards.length > 0) {
      const wildlifeVectors = [
        { x: -65, rotate: -4, scale: 0.88 },
        { y: 65, scale: 0.85, rotateX: 30 },
        { y: -65, scale: 0.85, rotateX: -30 },
        { x: 65, rotate: 4, scale: 0.88 },
      ];
      wildlifeCards.forEach((wCard, idx) => {
        const wVec = wildlifeVectors[idx % wildlifeVectors.length];
        const wImg = wCard.querySelector("img");
        const wTexts = wCard.querySelectorAll(".paragraph");

        const tl = gsap.timeline({
          scrollTrigger: { trigger: wCard, start: "top 88%", toggleActions: "play none none reverse" },
        });
        tl.fromTo(
          wCard,
          { ...wVec, opacity: 0 },
          { x: 0, y: 0, rotate: 0, rotateX: 0, scale: 1, opacity: 1, duration: 0.8, delay: idx * 0.08, ease: "back.out(1.4)" }
        );
        if (wImg) {
          tl.fromTo(wImg, { scale: 1.22 }, { scale: 1, duration: 0.85, ease: "power2.out" }, "-=0.65");
        }
        if (wTexts.length > 0) {
          tl.fromTo(wTexts, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.08 }, "-=0.5");
        }
      });
    }

    // 9. SECTION: MEET JANAKA & THE TEAM (.home-meet-janaka)
    const meetSection = document.querySelector(".home-meet-janaka");
    if (meetSection) {
      const meetImg = meetSection.querySelector(".wsite-image img");
      const meetHeading = meetSection.querySelector("h2.wsite-content-title");
      const meetParas = gsap.utils.toArray(meetSection.querySelectorAll(".paragraph"));
      const meetBtn = meetSection.querySelector(".wsite-button");

      const meetTl = gsap.timeline({
        scrollTrigger: { trigger: meetSection, start: "top 80%", toggleActions: "play none none reverse" },
      });

      if (meetImg) {
        meetTl.fromTo(
          meetImg,
          { x: -70, rotate: -4, scale: 0.9, opacity: 0 },
          { x: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.95, ease: "power3.out" }
        );
      }
      if (meetHeading) {
        meetTl.fromTo(
          meetHeading,
          { y: -35, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "back.out(1.7)" },
          "-=0.6"
        );
      }
      if (meetParas.length > 0) {
        meetTl.fromTo(
          meetParas,
          { x: 50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.65, stagger: 0.14, ease: "power2.out" },
          "-=0.45"
        );
      }
      if (meetBtn) {
        meetTl.fromTo(
          meetBtn,
          { scale: 0.75, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7, ease: "elastic.out(1, 0.55)" },
          "-=0.35"
        );
      }
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
        scrollTrigger: { trigger: reviewsSection, start: "top 80%", toggleActions: "play none none reverse" },
      });

      if (revHeading) {
        revTl.fromTo(revHeading, { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" });
      }
      if (revAward) {
        revTl.fromTo(
          revAward,
          { x: -60, rotateY: -25, opacity: 0, scale: 0.88 },
          { x: 0, rotateY: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.6)" },
          "-=0.4"
        );
      }
      if (revSummary) {
        revTl.fromTo(
          revSummary,
          { x: 60, opacity: 0, scale: 0.94 },
          { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" },
          "-=0.6"
        );
      }
      if (revListItems.length > 0) {
        revTl.fromTo(
          revListItems,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.5)" },
          "-=0.45"
        );
      }
      if (googleBtn) {
        revTl.fromTo(
          googleBtn,
          { y: 24, opacity: 0, scale: 0.85 },
          { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "elastic.out(1, 0.6)" },
          "-=0.3"
        );
      }
    }

    // 11. SECTION: HAMBANTOTA PORT SAFARIS (.home-port-section)
    const portSection = document.querySelector(".home-port-section");
    if (portSection) {
      const portCards = gsap.utils.toArray(portSection.querySelectorAll(".home-port-card"));
      const portVectors = [
        { x: -70, y: 40, rotate: -4 },
        { x: 0, y: 70, scale: 0.84 },
        { x: 70, y: 40, rotate: 4 },
      ];
      portCards.forEach((pCard, i) => {
        const v = portVectors[i % portVectors.length];
        gsap.fromTo(
          pCard,
          { ...v, opacity: 0 },
          {
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            duration: 0.85,
            delay: i * 0.12,
            ease: "back.out(1.5)",
            scrollTrigger: { trigger: pCard, start: "top 88%", toggleActions: "play none none reverse" },
          }
        );
      });
    }

    // 12. SECTION: TRANSFERS & STAYS (.wsite-background-84) + OTHER PAGE SECTIONS
    const transfersSection = document.querySelector(".wsite-background-84");
    if (transfersSection) {
      const cols = gsap.utils.toArray(transfersSection.querySelectorAll(".wsite-multicol-col"));
      const colMotions = [
        { x: -65, rotateY: 20, opacity: 0 },
        { y: 65, scale: 0.86, opacity: 0 },
        { x: 65, rotateY: -20, opacity: 0 },
      ];
      cols.forEach((col, i) => {
        gsap.fromTo(
          col,
          colMotions[i % colMotions.length],
          {
            x: 0,
            y: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1,
            duration: 0.85,
            delay: i * 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: col, start: "top 86%", toggleActions: "play none none reverse" },
          }
        );
      });
    }

    // 13. OTHER INNER PAGES — Distinct Section & Item Animations for Park/Gallery/About/Contact Pages
    if (!document.querySelector(".janaka-benefits")) {
      const bodySections = gsap.utils.toArray(".wsite-body-section");
      bodySections.forEach((sec, secIdx) => {
        const headings = sec.querySelectorAll("h2.wsite-content-title, h3");
        const images = sec.querySelectorAll(".wsite-image img, .galleryImageHolder");
        const paragraphs = sec.querySelectorAll(".paragraph");

        if (headings.length > 0) {
          gsap.fromTo(
            headings,
            { y: 36, opacity: 0, skewX: secIdx % 2 === 0 ? -6 : 6 },
            {
              y: 0,
              opacity: 1,
              skewX: 0,
              duration: 0.8,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: { trigger: sec, start: "top 82%" },
            }
          );
        }
        if (images.length > 0) {
          gsap.fromTo(
            images,
            { scale: 0.88, y: 40, opacity: 0 },
            {
              scale: 1,
              y: 0,
              opacity: 1,
              duration: 0.85,
              stagger: 0.08,
              ease: "back.out(1.4)",
              scrollTrigger: { trigger: sec, start: "top 82%" },
            }
          );
        }
        if (paragraphs.length > 0) {
          gsap.fromTo(
            paragraphs,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.65,
              stagger: 0.06,
              ease: "power2.out",
              scrollTrigger: { trigger: sec, start: "top 80%" },
            }
          );
        }
      });
    }

    // 14. FOOTER — Staggered 3-Column Entrance
    const footerWrap = document.querySelector(".footer-wrap");
    if (footerWrap) {
      const footerCols = gsap.utils.toArray(footerWrap.querySelectorAll(".wsite-multicol-col"));
      gsap.fromTo(
        footerCols,
        { y: 45, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: { trigger: footerWrap, start: "top 90%" },
        }
      );
    }
  }

  bindEditableSlots();
  bindEditableTextSlots();
  applyEditModeState();
  initUltraSmoothScroll();
  void initDistinctGsapAnimations();
  void hydrateFromFirebaseCms();
})();
