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
      if (el.closest("dialog") || el.closest(".firebase-section-showcase")) return false;
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
            entry.element.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${ov.src}")`;
          } else {
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

  bindEditableSlots();
  bindEditableTextSlots();
  applyEditModeState();
  void hydrateFromFirebaseCms();
})();
