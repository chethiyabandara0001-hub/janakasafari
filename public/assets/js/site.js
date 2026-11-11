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
      if (cms.imageOverrides) {
        Object.values(cms.imageOverrides).forEach((ov) => {
          if (!ov || ov.page !== currentPageFile || !ov.src) return;
          const entry = slotElementMap.get(ov.slotId);
          if (!entry) return;
          if (entry.type === "hero-bg") {
            if (/payment-|visa|mastercard/i.test(ov.src)) return;
            if (entry.element.classList.contains("wsite-body-section")) return;
            if (document.body.classList.contains("janaka-contact")) return;
            entry.element.style.backgroundImage = `url("${ov.src}")`;
            entry.element.style.backgroundSize = "cover";
            entry.element.style.backgroundPosition = "center center";
            if (document.body.classList.contains("wsite-page-index") && window.innerWidth > 767) {
              entry.element.style.minHeight = "135vh";
              entry.element.style.height = "135vh";
            }
          } else {
            if (
              entry.element.classList.contains("janaka-brand-logo") ||
              entry.element.classList.contains("tripadvisor-user-award-img") ||
              entry.element.id === "CDSWIDCOELOGO" ||
              entry.element.closest(".hero-cross-bridge-wrap") ||
              entry.element.closest(".home-review-award") ||
              entry.element.closest(".logo") ||
              entry.element.closest(".footer-wrap") ||
              /^data:image\/svg\+xml/i.test(ov.src)
            ) {
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
      s.async = false;
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.head.appendChild(s);
    });
  }

  async function initDistinctGsapAnimations() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (!window.gsap) {
        await loadScript("/assets/js/gsap.min.js?v=gsap5");
      }
      if (!window.ScrollTrigger) {
        await loadScript("/assets/js/ScrollTrigger.min.js?v=gsap5");
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

    // Sync ScrollTrigger with scrolling
    window.addEventListener("scroll", () => ScrollTrigger.update(), { passive: true });

    // Animated counters helper (works cleanly on both mobile and desktop)
    function initCrossBridgeCounters(toggleMode) {
      const crossCard = document.querySelector(".hero-cross-bridge-card");
      if (!crossCard) return;

      const scoreEl = crossCard.querySelector(".cross-score");
      if (scoreEl) {
        const scoreObj = { val: 0 };
        gsap.fromTo(
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
            },
            onUpdate: () => {
              scoreEl.textContent = scoreObj.val.toFixed(1);
            },
          }
        );
      }

      const metricEl = crossCard.querySelector(".cross-metric");
      if (metricEl) {
        const countObj = { val: 0 };
        gsap.fromTo(
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
            },
            onUpdate: () => {
              metricEl.textContent = `${Math.round(countObj.val).toLocaleString()}+`;
            },
          }
        );
      }
    }

    // Shared helper to animate #firebase-section-gallery & #firebase-section-grid items
    // whether rendered before or after GSAP initialization
    function animateFirebaseSectionGallery() {
      const showcase = document.getElementById("firebase-section-gallery");
      const grid = document.getElementById("firebase-section-grid");
      if (!showcase || !grid || showcase.dataset.gsapAnimated === "true") return;
      showcase.dataset.gsapAnimated = "true";

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const header = showcase.querySelector(".firebase-section-header");
      const kicker = showcase.querySelector(".firebase-section-kicker");
      const title = showcase.querySelector(".firebase-section-title");
      const headerBtn = showcase.querySelector(".firebase-section-header .admin-dock-btn");
      const cards = gsap.utils.toArray(grid.querySelectorAll(".firebase-section-card"));

      if (isMobile) {
        if (header) {
          gsap.fromTo(
            [kicker, title, headerBtn].filter(Boolean),
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power2.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: showcase,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        }
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
              start: "top 93%",
              toggleActions: "play none none none",
            },
          });
          tl.fromTo(
            card,
            { y: 24, scale: 0.98, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
          );
          if (img) {
            tl.fromTo(
              img,
              { scale: 1.12, autoAlpha: 0.7 },
              { scale: 1, autoAlpha: 1, duration: 0.55, ease: "power2.out", clearProps: "transform" },
              "-=0.4"
            );
          }
          if (innerItems.length > 0) {
            tl.fromTo(
              innerItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
              "-=0.35"
            );
          }
        });
      } else {
        const headerTl = gsap.timeline({
          scrollTrigger: {
            trigger: showcase,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        });
        if (kicker) {
          headerTl.fromTo(
            kicker,
            { x: -45, autoAlpha: 0, skewX: -10 },
            { x: 0, autoAlpha: 1, skewX: 0, duration: 0.65, ease: "expo.out" }
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
              start: "top 88%",
              toggleActions: "play none none reverse",
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

          if (hasFinePointer && card instanceof HTMLElement) {
            card.style.transformStyle = "preserve-3d";
            card.addEventListener("mousemove", (e) => {
              const rect = card.getBoundingClientRect();
              const relX = (e.clientX - rect.left) / rect.width - 0.5;
              const relY = (e.clientY - rect.top) / rect.height - 0.5;
              gsap.to(card, {
                rotateY: relX * 10,
                rotateX: -relY * 10,
                y: -7,
                scale: 1.02,
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
    }

    window.__animateFirebaseSectionGallery = animateFirebaseSectionGallery;

    const mm = gsap.matchMedia();

    // ============================================================================
    // A. MOBILE-FIRST GSAP PROFILE (max-width: 767px)
    //    - Zero horizontal x-offsets, skews, or 3D rotations that break mobile width
    //    - Zero heroBg scale transform so hero text/buttons never zoom off-screen
    //    - Per-element triggers ("play none none none") + clearProps: "transform"
    //      so stacked cards and their inner items reveal smoothly as user scrolls
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
          { y: -12, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.45,
            stagger: 0.06,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }

      // 2. Mobile Hero content & items clean vertical reveal (Selector 1)
      if (!document.body.classList.contains("janaka-contact")) {
        const heroSectionContent = document.querySelector(".banner-wrap .wsite-header-section .wsite-section-content");
        const heroEls = gsap.utils.toArray(
          ".banner .hero-editorial-kicker, .banner h2.wsite-content-title, .banner .sri-lanka-tracks, .banner .paragraph, .banner .wsite-button"
        );
        const mobileHeroTl = gsap.timeline({ defaults: { ease: "power2.out" } });
        if (heroSectionContent) {
          mobileHeroTl.fromTo(
            heroSectionContent,
            { autoAlpha: 0.01, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.45, clearProps: "transform" }
          );
        }
        if (heroEls.length > 0) {
          mobileHeroTl.fromTo(
            heroEls,
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.55,
              stagger: 0.08,
              clearProps: "transform",
            },
            "-=0.3"
          );
        }
      } else {
        const contactTop = gsap.utils.toArray(
          "body.janaka-contact .banner h2.wsite-content-title, body.janaka-contact .banner > .wsite-section-elements > .paragraph"
        );
        if (contactTop.length > 0) {
          gsap.fromTo(
            contactTop,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: "power2.out", clearProps: "transform" }
          );
        }
        const contactCols = gsap.utils.toArray(
          "body.janaka-contact .contact-cards > .wsite-multicol-table-wrap > .wsite-multicol-table > .wsite-multicol-tbody > .wsite-multicol-tr > .wsite-multicol-col"
        );
        contactCols.forEach((col) => {
          gsap.fromTo(
            col,
            { y: 22, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              ease: "power2.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: col,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }

      // 3. Mobile Cross-Section Bridge Card & Sub-Sections
      const crossCard = document.querySelector(".hero-cross-bridge-card");
      if (crossCard) {
        gsap.fromTo(
          crossCard,
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: "power2.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: crossCard,
              start: "top 95%",
              toggleActions: "play none none none",
            },
          }
        );

        const crossSubs = gsap.utils.toArray(".hero-cross-sub-section");
        crossSubs.forEach((sub, idx) => {
          gsap.fromTo(
            sub,
            { y: 16, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.45,
              delay: idx * 0.06,
              ease: "power2.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: sub,
                start: "top 95%",
                toggleActions: "play none none none",
              },
            }
          );
        });

        initCrossBridgeCounters("play none none none");
      }

      // 4. Mobile Direct Booking Section & Items (Selector 2: .wsite-background-75 .container)
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
          },
        });
        directTl.fromTo(
          mobileDirectContainer,
          { y: 24, scale: 0.98, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
        );
        if (directItems.length > 0) {
          directTl.fromTo(
            directItems,
            { y: 16, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power2.out", clearProps: "transform" },
            "-=0.3"
          );
        }
      }

      // 5. Mobile Safari Experiences Section & Cards + Inner Items (Selector 3: .wsite-background-1 .container)
      const mobileSafariSection = document.querySelector(".wsite-background-1 .container");
      if (mobileSafariSection) {
        const safariHeadings = gsap.utils.toArray(mobileSafariSection.querySelectorAll("h2.wsite-content-title"));
        if (safariHeadings.length > 0) {
          gsap.fromTo(
            safariHeadings,
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power2.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: mobileSafariSection,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
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
            },
          });
          tl.fromTo(
            card,
            { y: 24, scale: 0.98, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
          );
          if (img) {
            tl.fromTo(
              img,
              { scale: 1.12 },
              { scale: 1, duration: 0.55, ease: "power2.out", clearProps: "transform" },
              "-=0.4"
            );
          }
          if (innerEls.length > 0) {
            tl.fromTo(
              innerEls,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
              "-=0.35"
            );
          }
        });
      }

      // 6. Mobile Yala Spotlight & Wildlife Section + Inner Items (Selector 6: .home-wildlife-section .container)
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
            },
          });
          yalaTl.fromTo(
            yalaFeature,
            { y: 24, scale: 0.98, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
          );
          if (yalaImg) {
            yalaTl.fromTo(
              yalaImg,
              { scale: 1.1 },
              { scale: 1, duration: 0.55, ease: "power2.out", clearProps: "transform" },
              "-=0.4"
            );
          }
          if (yalaItems.length > 0) {
            yalaTl.fromTo(
              yalaItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
              "-=0.35"
            );
          }
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
            },
          });
          tl.fromTo(
            wCard,
            { y: 22, scale: 0.98, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
          );
          if (wImg) {
            tl.fromTo(
              wImg,
              { scale: 1.12 },
              { scale: 1, duration: 0.55, ease: "power2.out", clearProps: "transform" },
              "-=0.4"
            );
          }
          if (wItems.length > 0) {
            tl.fromTo(
              wItems,
              { y: 12, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "transform" },
              "-=0.35"
            );
          }
        });
      }

      // 7. Mobile Hambantota Port Section & Cards + Inner Items (Selector 4: .home-port-section .container)
      const mobilePortContainer = document.querySelector(".home-port-section .container");
      if (mobilePortContainer) {
        const portIntroEls = gsap.utils.toArray(
          mobilePortContainer.querySelectorAll(
            ":scope > .wsite-section-elements > .paragraph, :scope > .wsite-section-elements > h2.wsite-content-title"
          )
        );
        if (portIntroEls.length > 0) {
          gsap.fromTo(
            portIntroEls,
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.48,
              stagger: 0.07,
              ease: "power2.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: mobilePortContainer,
                start: "top 92%",
                toggleActions: "play none none none",
              },
            }
          );
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
            },
          });
          tl.fromTo(
            pCard,
            { y: 24, scale: 0.98, autoAlpha: 0 },
            { y: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" }
          );
          if (pImg) {
            tl.fromTo(
              pImg,
              { scale: 1.12 },
              { scale: 1, duration: 0.55, ease: "power2.out", clearProps: "transform" },
              "-=0.4"
            );
          }
          if (pItems.length > 0) {
            tl.fromTo(
              pItems,
              { y: 14, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
              "-=0.35"
            );
          }
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
        gsap.fromTo(
          h,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: h,
              start: "top 92%",
              toggleActions: "play none none none",
            },
          }
        );
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
        gsap.fromTo(
          card,
          { y: 22, scale: 0.98, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            clearProps: "transform",
            scrollTrigger: {
              trigger: card,
              start: "top 93%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      animateFirebaseSectionGallery();
    });

    // ============================================================================
    // B. DESKTOP & TABLET GSAP PROFILE (min-width: 768px)
    //    - Distinct multi-directional choreographies, 3D hover physics (fine pointer),
    //      hero Ken Burns parallax, and staggered inner-item animations
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
        gsap.to(headerLogo, {
          y: -3,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1.2,
        });
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

      // 2. HERO BANNER & ITEMS (Selector 1: .banner-wrap .wsite-header-section .wsite-section-content)
      if (!document.body.classList.contains("janaka-contact")) {
        const heroSectionContent = document.querySelector(".banner-wrap .wsite-header-section .wsite-section-content");
        const heroKicker = document.querySelector(".banner .hero-editorial-kicker");
        const heroTitle = document.querySelector(".banner h2.wsite-content-title");
        const heroHighlight = document.querySelector(".banner .sri-lanka-tracks");
        const heroParagraphs = gsap.utils.toArray(".banner .paragraph");
        const heroBtn = document.querySelector(".banner .wsite-button");
        const heroBg = document.querySelector(".banner-wrap .wsite-header-section");
        const isHome = document.body.classList.contains("wsite-page-index");

        if (heroBg) {
          const baseScale = isHome ? 1.22 : 1.12;
          gsap.fromTo(
            heroBg,
            { scale: baseScale + 0.12 },
            { scale: baseScale, duration: 2.0, ease: "power3.out" }
          );
          gsap.to(heroBg, {
            backgroundPositionY: "65%",
            scale: baseScale + 0.06,
            ease: "none",
            scrollTrigger: {
              trigger: ".banner-wrap",
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        const heroTl = gsap.timeline({ delay: 0.08 });
        if (heroSectionContent) {
          heroTl.fromTo(
            heroSectionContent,
            { autoAlpha: 0.01, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.65, ease: "power3.out" }
          );
        }
        if (heroKicker) {
          heroTl.fromTo(
            heroKicker,
            { x: -60, autoAlpha: 0, skewX: -12, scale: 0.92 },
            { x: 0, autoAlpha: 1, skewX: 0, scale: 1, duration: 0.85, ease: "expo.out" },
            "-=0.45"
          );
        }
        if (heroTitle) {
          heroTl.fromTo(
            heroTitle,
            { y: 55, autoAlpha: 0, scale: 0.92, rotateX: 20, transformPerspective: 1000 },
            { y: 0, autoAlpha: 1, scale: 1, rotateX: 0, transformPerspective: 1000, duration: 1.0, ease: "power4.out" },
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
          gsap.to(heroHighlight, {
            y: -3,
            scale: 1.02,
            duration: 2.4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1.5,
          });
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
          gsap.to(heroBtn, {
            y: -4,
            duration: 2.3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1.8,
          });
        }
      }

      // 3. CROSS-SECTION BRIDGE
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
            toggleActions: "play none none reverse",
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
          gsap.to(imgGoogle, { y: -5, rotate: 3, duration: 2.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.2 });
        }
        if (imgTrip) {
          crossTl.fromTo(
            imgTrip,
            { scale: 0.4, y: -25, autoAlpha: 0 },
            { scale: 1, y: 0, autoAlpha: 1, duration: 0.85, ease: "elastic.out(1, 0.5)" },
            "-=0.65"
          );
          gsap.to(imgTrip, { y: -6, scale: 1.03, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.5 });
        }
        if (imgTraveler) {
          crossTl.fromTo(
            imgTraveler,
            { x: -25, scale: 0.5, rotate: 15, autoAlpha: 0 },
            { x: 0, scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(2)" },
            "-=0.65"
          );
          gsap.to(imgTraveler, { y: -5, x: 3, duration: 2.0, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.8 });
        }
        if (starsEl) {
          crossTl.fromTo(
            starsEl,
            { scale: 0.6, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.65, ease: "back.out(2)" },
            "-=0.45"
          );
        }

        bindGsap3DHover([subLeft, subCenter, subRight], 5, -5, 1.02);
        initCrossBridgeCounters("restart none restart none");
      }

      // 4. SECTION: WHY EXPLORE WITH NISHA (.janaka-benefits)
      const benefitsSection = document.querySelector(".janaka-benefits");
      if (benefitsSection) {
        const heading = benefitsSection.querySelector("h2.wsite-content-title");
        const benefitCols = gsap.utils.toArray(benefitsSection.querySelectorAll(".benefit-column"));

        if (heading) {
          gsap.fromTo(
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
                trigger: benefitsSection,
                start: "top 86%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        const distinctBenefitFromVars = [
          { x: -75, y: 45, rotate: -6, autoAlpha: 0, scale: 0.86 },
          { y: 75, rotateX: 40, transformPerspective: 900, autoAlpha: 0, scale: 0.84 },
          { y: -70, rotateX: -40, transformPerspective: 900, autoAlpha: 0, scale: 0.84 },
          { x: 75, y: 45, rotate: 6, autoAlpha: 0, scale: 0.86 },
        ];

        benefitCols.forEach((col, i) => {
          const fromVars = distinctBenefitFromVars[i % distinctBenefitFromVars.length];
          const icon = col.querySelector(".benefit-icon");
          const title = col.querySelector(".benefit-title");
          const texts = col.querySelectorAll(".paragraph:not(.benefit-title)");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: col,
              start: "top 88%",
              toggleActions: "play none none reverse",
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
              delay: (i % 4) * 0.08,
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
            gsap.to(icon, {
              y: -5,
              rotate: i % 2 === 0 ? 4 : -4,
              duration: 2.1 + i * 0.25,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              delay: 1 + i * 0.2,
            });
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
        });

        bindGsap3DHover(benefitCols, 7, -8, 1.03);
      }

      // 5. SECTION: SAVE UP TO 30% DIRECT BOOKING & ITEMS (Selector 2: .wsite-background-75 .container)
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

        const directTl = gsap.timeline({
          scrollTrigger: {
            trigger: directContainer || directSection,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });

        if (directContainer) {
          directTl.fromTo(
            directContainer,
            { y: 50, scale: 0.93, rotateX: 12, transformPerspective: 1000, autoAlpha: 0 },
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
          payCards.forEach((pCard, idx) => {
            gsap.to(pCard, {
              y: -4,
              rotate: idx === 0 ? -2 : 2,
              duration: 2.2 + idx * 0.3,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              delay: 1.4 + idx * 0.25,
            });
          });
          bindGsap3DHover(payCards, 8, -5, 1.06);
        }
      }

      // 6. SECTION: WHY CHOOSE US (.home-why-choose)
      const whyChooseSection = document.querySelector(".home-why-choose");
      if (whyChooseSection) {
        const featureImg = whyChooseSection.querySelector(".wsite-image img");
        const heading = whyChooseSection.querySelector("h2.wsite-content-title");
        const steps = gsap.utils.toArray(whyChooseSection.querySelectorAll(".why-row .paragraph"));
        const btn = whyChooseSection.querySelector(".wsite-button");

        if (featureImg) {
          gsap.fromTo(
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
                start: "top 82%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }

        const rightTl = gsap.timeline({
          scrollTrigger: {
            trigger: whyChooseSection,
            start: "top 82%",
            toggleActions: "play none none reverse",
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
      }

      // 7. SECTION: 6 SAFARI EXPERIENCES GRID & ITEMS (Selector 3: .wsite-background-1 .container)
      const safariSection = document.querySelector(".wsite-background-1 .container");
      const safariCards = gsap.utils.toArray(".home-safari-card");
      if (safariCards.length > 0) {
        const safariHeaders = gsap.utils.toArray(".wsite-background-1 h2.wsite-content-title");
        if (safariHeaders.length > 0) {
          gsap.fromTo(
            safariHeaders,
            { y: 40, autoAlpha: 0, scale: 0.92, rotateX: 18, transformPerspective: 900 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              rotateX: 0,
              transformPerspective: 900,
              duration: 0.8,
              stagger: 0.14,
              ease: "back.out(1.6)",
              scrollTrigger: {
                trigger: safariSection || ".wsite-background-1",
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
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
              start: "top 88%",
              toggleActions: "play none none reverse",
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
              { x: -22, autoAlpha: 0 },
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
        });

        bindGsap3DHover(safariCards, 5, -7, 1.02);
      }

      // 8. SECTION: YALA SPOTLIGHT & WILDLIFE ENCOUNTERS + ITEMS (Selector 6: .home-wildlife-section .container)
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
            start: "top 85%",
            toggleActions: "play none none reverse",
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
        bindGsap3DHover(yalaFeature, 3, -5, 1.01);
      }

      if (wildlifeSection) {
        const wildlifeDivider = wildlifeSection.querySelector("hr.styled-hr");
        const wildlifeHeading = wildlifeSection.querySelector(".home-wildlife-heading");
        const wildlifeFooterNote = wildlifeSection.querySelector(
          ".wsite-section-elements > .paragraph:last-of-type"
        );

        if (wildlifeDivider) {
          gsap.fromTo(
            wildlifeDivider,
            { scaleX: 0, autoAlpha: 0 },
            {
              scaleX: 1,
              autoAlpha: 1,
              duration: 0.8,
              ease: "expo.out",
              scrollTrigger: {
                trigger: wildlifeDivider,
                start: "top 90%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
        if (wildlifeHeading) {
          gsap.fromTo(
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
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
        if (wildlifeFooterNote) {
          gsap.fromTo(
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
                toggleActions: "play none none reverse",
              },
            }
          );
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
              start: "top 88%",
              toggleActions: "play none none reverse",
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
        });
        bindGsap3DHover(wildlifeCards, 5, -6, 1.02);
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
            start: "top 84%",
            toggleActions: "play none none reverse",
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
            start: "top 84%",
            toggleActions: "play none none reverse",
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
        bindGsap3DHover([revAward, revSummary], 5, -5, 1.02);
      }

      // 11. SECTION: HAMBANTOTA PORT SAFARIS & ITEMS (Selector 4: .home-port-section .container)
      const portSection = document.querySelector(".home-port-section");
      if (portSection) {
        const portContainer = portSection.querySelector(".container");
        const portIntroHeaderEls = gsap.utils.toArray(
          portSection.querySelectorAll(
            ".container > .wsite-section-elements > .paragraph, .container > .wsite-section-elements > h2.wsite-content-title"
          )
        );
        const portCards = gsap.utils.toArray(portSection.querySelectorAll(".home-port-card"));

        if (portIntroHeaderEls.length > 0) {
          gsap.fromTo(
            portIntroHeaderEls,
            { y: 34, autoAlpha: 0, scale: 0.94 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.75,
              stagger: 0.12,
              ease: "back.out(1.6)",
              scrollTrigger: {
                trigger: portContainer || portSection,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
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
              start: "top 88%",
              toggleActions: "play none none reverse",
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
        });
        bindGsap3DHover(portCards, 5, -6, 1.02);
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
          gsap.fromTo(
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
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
        bindGsap3DHover(cols, 5, -6, 1.02);
      }

      // 13. INNER PAGES — Per-Card & Per-Element Desktop Triggers
      if (!document.querySelector(".janaka-benefits")) {
        const innerHeadings = gsap.utils.toArray(".wsite-body-section h2.wsite-content-title");
        innerHeadings.forEach((h) => {
          gsap.fromTo(
            h,
            { y: 35, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.75,
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: h,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });

        const innerCards = gsap.utils.toArray(
          ".parks-overview-card, .wsite-body-section .wsite-multicol-col, .port-safari-card, .udawalawe-port-card, .bundala-port-card, .reviews-widget, .janaka-gyg, .imageGallery .galleryImageHolder, body.janaka-contact .contact-cards > .wsite-multicol-table-wrap > .wsite-multicol-table > .wsite-multicol-tbody > .wsite-multicol-tr > .wsite-multicol-col"
        );
        innerCards.forEach((card, i) => {
          gsap.fromTo(
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
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      }

      // 14. FOOTER — Staggered 3-Column Entrance
      const footerWrap = document.querySelector(".footer-wrap");
      if (footerWrap) {
        const footerCols = gsap.utils.toArray(footerWrap.querySelectorAll(".wsite-multicol-col"));
        gsap.fromTo(
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
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // 15. FIREBASE LIVE SECTION GALLERY (Selector 5: #firebase-section-gallery > #firebase-section-grid)
      animateFirebaseSectionGallery();
    });

    // Ensure ScrollTrigger recalculates after layout/images settle
    setTimeout(() => ScrollTrigger.refresh(), 250);
    setTimeout(() => ScrollTrigger.refresh(), 1000);
    window.addEventListener("load", () => ScrollTrigger.refresh());
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
