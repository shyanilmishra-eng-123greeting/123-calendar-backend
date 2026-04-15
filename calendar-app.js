document.addEventListener("DOMContentLoaded", () => {
    const CARD_LIBRARY_URL = "https://www.123greetings.com/birthday/happy_birthday/";
    const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    const PROFILE_STORAGE_KEY = "calendarDummyProfile";
    const DEFAULT_COUNTRY = "in";
    const countryOptions = {
        us: { label: "United States", flag: "US", dialCode: "+1" },
        uk: { label: "United Kingdom", flag: "UK", dialCode: "+44" },
        in: { label: "India", flag: "IN", dialCode: "+91" }
    };
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const groqApiKey = window.CALENDAR_APP_CONFIG?.groqApiKey || "";

    const monthDisplay = document.getElementById("month-display");
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");
    const profileBtn = document.getElementById("profile-btn");
    const modalBackdrop = document.getElementById("event-modal-backdrop");
    const modal = document.getElementById("event-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalDateDisplay = document.getElementById("modal-date");
    const modalBody = document.getElementById("modal-body");
    const modalMode = document.getElementById("modal-mode");
    const modalCloseBtn = document.getElementById("modal-close-btn");

    let currentDate = new Date();
    const realToday = new Date();
    let userProfile = loadProfile();

    const events = {
        "2026-04-01": { title: "April Fools' Day", img: "https://images.unsplash.com/photo-1598282305593-9c882af7fd8e?auto=format&fit=crop&q=80&w=200&h=200" },
        "2026-04-05": { title: "Easter Sunday", img: "https://images.unsplash.com/photo-1521990861614-36873bdeb9ee?auto=format&fit=crop&q=80&w=200&h=200" },
        "2026-04-22": { title: "Earth Day", img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=200&h=200" }
    };

    function loadProfile() {
        try {
            const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (error) {
            return null;
        }
    }

    function saveProfile(profile) {
        userProfile = {
            name: profile.name?.trim() || "",
            email: profile.email?.trim() || "",
            phone: profile.phone?.trim() || "",
            country: profile.country || DEFAULT_COUNTRY,
            reminderTime: profile.reminderTime || "09:00"
        };
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
        syncProfileButton();
    }

    function getCountryMeta(countryCode) {
        return countryOptions[countryCode] || countryOptions[DEFAULT_COUNTRY];
    }

    function getPhoneDisplay(profile) {
        if (!profile?.phone) return "Not saved";
        return `${getCountryMeta(profile.country).dialCode} ${profile.phone}`;
    }

    function syncProfileButton() {
        profileBtn.textContent = userProfile?.name ? userProfile.name : "Profile";
    }

    function formatDateLabel(dateObj) {
        return `${monthNames[dateObj.getMonth()]} ${String(dateObj.getDate()).padStart(2, "0")}, ${dateObj.getFullYear()}`;
    }

    function getDateString(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function getItemsForDate(dateStr) {
        return events[dateStr] ? [events[dateStr]] : [];
    }

    function renderCalendar(date) {
        calendarGrid.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        monthDisplay.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.className = "hidden sm:block cal-tile empty";
            calendarGrid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = getDateString(year, month, day);
            const evt = events[dateStr];
            const isToday = (
                day === realToday.getDate() &&
                month === realToday.getMonth() &&
                year === realToday.getFullYear()
            );
            const tile = document.createElement("div");
            tile.className = `cal-tile flex flex-col p-3 sm:p-4${isToday ? " is-today" : ""}${evt ? " has-event" : ""}`;

            tile.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <span class="day-number text-sm font-black ${isToday ? "text-indigo-600" : "text-zinc-700"}">${day}</span>
                    <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">${dayNames[new Date(year, month, day).getDay()]}</span>
                </div>
                ${evt ? `
                    <div class="flex-grow flex flex-col items-center justify-center">
                        <img src="${evt.img}" alt="${evt.title}" class="w-10 h-10 object-contain drop-shadow-md rounded-xl" onerror="this.style.display='none'">
                    </div>
                    <div class="sm:hidden absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                ` : "<div class='flex-grow'></div>"}
                <div class="tile-actions">
                    <button class="tile-action-btn btn-reminder !bg-green-50 !text-green-500 hover:!bg-green-100" title="Remind in WhatsApp" data-date="${dateStr}">
                        <i class="fa-brands fa-whatsapp font-bold text-sm"></i>
                    </button>
                    <button class="tile-action-btn btn-greeting" title="Craft Greeting" data-date="${dateStr}">
                        <i class="fa-solid fa-pen-nib text-sm"></i>
                    </button>
                </div>
            `;

            tile.querySelector(".btn-reminder").addEventListener("click", (event) => {
                event.stopPropagation();
                openModal(dateStr, "reminder");
            });
            tile.querySelector(".btn-greeting").addEventListener("click", (event) => {
                event.stopPropagation();
                openModal(dateStr, "greeting");
            });
            calendarGrid.appendChild(tile);
        }

        renderEventsList(date);
    }

    function renderEventsList(date) {
        const list = document.getElementById("upcoming-events-list");
        list.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthStr = String(month + 1).padStart(2, "0");
        const monthEvents = Object.entries(events).filter(([dateStr]) => dateStr.startsWith(`${year}-${monthStr}-`));

        if (!monthEvents.length) {
            list.innerHTML = `<p class="col-span-full py-8 text-center font-bold text-zinc-300 uppercase tracking-widest text-[10px]">No items this month.</p>`;
            return;
        }

        monthEvents.forEach(([dateStr, evt]) => {
            const day = Number(dateStr.split("-")[2]);
            const card = document.createElement("div");
            card.className = "flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-md transition-all cursor-pointer";
            card.innerHTML = `
                <div class="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm border border-zinc-100">
                    <img src="${evt.img}" alt="${evt.title}" class="w-full h-full object-cover">
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="text-sm font-black font-headline truncate text-zinc-800">${evt.title}</h4>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">${monthNames[month]} ${String(day).padStart(2, "0")}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button class="list-whatsapp w-10 h-10 rounded-xl bg-green-50 text-green-500 hover:bg-green-100 transition-all flex items-center justify-center shadow-sm" title="Remind in WhatsApp">
                        <i class="fa-brands fa-whatsapp text-lg"></i>
                    </button>
                    <button class="list-pen w-10 h-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all flex items-center justify-center shadow-sm" title="Greeting">
                        <i class="fa-solid fa-pen-nib text-lg text-indigo-500"></i>
                    </button>
                </div>
            `;
            card.querySelector(".list-whatsapp").addEventListener("click", (event) => {
                event.stopPropagation();
                openModal(dateStr, "reminder");
            });
            card.querySelector(".list-pen").addEventListener("click", (event) => {
                event.stopPropagation();
                openModal(dateStr, "greeting");
            });
            list.appendChild(card);
        });
    }

    function getProfileFormMarkup(title, ctaLabel) {
        return `
            <div class="space-y-4">
                <p class="text-zinc-500 text-sm">${title}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full Name</label>
                        <input id="profile-name" type="text" value="${userProfile?.name || ""}" placeholder="Your name" class="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold text-zinc-800 placeholder:font-normal">
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</label>
                        <input id="profile-email" type="email" value="${userProfile?.email || ""}" placeholder="you@example.com" class="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold text-zinc-800 placeholder:font-normal">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Country</label>
                        <select id="profile-country" class="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-400 text-zinc-700 font-bold">
                            ${Object.entries(countryOptions).map(([value, meta]) => `
                                <option value="${value}" ${value === (userProfile?.country || DEFAULT_COUNTRY) ? "selected" : ""}>${meta.flag} ${meta.label} (${meta.dialCode})</option>
                            `).join("")}
                        </select>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Phone Number</label>
                        <input id="profile-phone" type="tel" value="${userProfile?.phone || ""}" placeholder="9876543210" class="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold text-zinc-800 placeholder:font-normal">
                    </div>
                    <div class="flex flex-col gap-1 sm:col-span-2">
                        <label class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reminder Time</label>
                        <input id="profile-reminder-time" type="time" value="${userProfile?.reminderTime || "09:00"}" class="w-full bg-zinc-50 border border-zinc-200 p-2.5 rounded-xl text-sm outline-none focus:border-indigo-400 text-zinc-700 font-bold">
                    </div>
                </div>
                <button id="save-profile-btn" class="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                    ${ctaLabel}
                </button>
            </div>
        `;
    }

    function collectProfileFormValues() {
        const name = modalBody.querySelector("#profile-name")?.value.trim() || "";
        const email = modalBody.querySelector("#profile-email")?.value.trim() || "";
        const country = modalBody.querySelector("#profile-country")?.value || DEFAULT_COUNTRY;
        const phone = modalBody.querySelector("#profile-phone")?.value.trim() || "";
        const reminderTime = modalBody.querySelector("#profile-reminder-time")?.value || "09:00";

        if (!name || !phone) {
            window.alert("Name and phone number are required.");
            return null;
        }

        return { name, email, country, phone, reminderTime };
    }

    function bindProfileSave(onSave) {
        modalBody.querySelector("#save-profile-btn")?.addEventListener("click", () => {
            const nextProfile = collectProfileFormValues();
            if (!nextProfile) return;
            saveProfile(nextProfile);
            onSave(nextProfile);
        });
    }

    function renderProfileModal() {
        modalTitle.textContent = userProfile?.name ? "Profile Details" : "Set Up Profile";
        modalDateDisplay.textContent = "Dummy Profile";
        modalMode.innerHTML = "<i class='fa-solid fa-user text-indigo-500'></i> Local Only";
        modalBody.innerHTML = getProfileFormMarkup(
            "Save your details locally for now. Later this can be replaced with Supabase or Firebase auth.",
            userProfile?.name ? "Update Profile" : "Save Profile"
        );
        bindProfileSave(() => {
            closeModal();
        });
        showModal();
    }

    function renderReminderConfirmation(dateStr, evt) {
        const countryMeta = getCountryMeta(userProfile.country);
        modalBody.innerHTML = `
            <div class="space-y-4">
                <p class="text-zinc-500 text-sm">Your reminder details are already saved. Confirm once and this event is ready for the auth-backed version later.</p>
                <div class="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Name</p>
                        <p class="text-sm font-bold text-zinc-800">${userProfile.name}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">WhatsApp</p>
                        <p class="text-sm font-bold text-zinc-800">${countryMeta.flag} ${countryMeta.dialCode} ${userProfile.phone}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reminder Time</p>
                        <p class="text-sm font-bold text-zinc-800">${userProfile.reminderTime}</p>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button id="edit-profile-inline-btn" class="flex-1 py-3 border border-zinc-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all">Edit Details</button>
                    <button id="confirm-reminder-btn" class="flex-1 py-3 bg-green-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-green-600 transition-all">Confirm Reminder</button>
                </div>
            </div>
        `;

        modalBody.querySelector("#edit-profile-inline-btn").addEventListener("click", () => {
            renderReminderSetup(dateStr, evt, true);
        });
        modalBody.querySelector("#confirm-reminder-btn").addEventListener("click", () => {
            window.alert(`Dummy reminder saved for ${evt ? evt.title : formatDateLabel(new Date(`${dateStr}T00:00:00`))} at ${userProfile.reminderTime}.`);
            closeModal();
        });
    }

    function renderReminderSetup(dateStr, evt, isEditMode = false) {
        modalBody.innerHTML = getProfileFormMarkup(
            isEditMode
                ? "Update your saved reminder details. These are still stored locally only."
                : "Save your details once for this dummy version. The next step can swap this storage to real auth.",
            isEditMode ? "Update and Confirm" : "Save and Continue"
        );
        bindProfileSave(() => {
            renderReminderConfirmation(dateStr, evt);
        });
    }

    function openModal(dateStr, mode) {
        const evt = events[dateStr];
        const dateObj = new Date(`${dateStr}T00:00:00`);
        modalTitle.textContent = evt ? evt.title : "Calendar Event";
        modalDateDisplay.textContent = formatDateLabel(dateObj);

        if (mode === "reminder") {
            modalMode.innerHTML = "<i class='fa-brands fa-whatsapp text-green-500'></i> WhatsApp Reminder";
            if (userProfile?.name && userProfile?.phone) {
                renderReminderConfirmation(dateStr, evt);
            } else {
                renderReminderSetup(dateStr, evt);
            }
        } else {
            const defaultGreeting = userProfile?.name
                ? `Happy ${evt ? evt.title : "celebration"}.\n\nWarm wishes,\n${userProfile.name}`
                : `Happy ${evt ? evt.title : "celebration"}!`;
            modalMode.innerHTML = "<i class='fa-solid fa-pen-nib text-indigo-500'></i> Craft Greeting";
            modalBody.innerHTML = `
                <div class="space-y-4">
                    <p class="text-zinc-500 text-sm">${userProfile?.name ? `Your saved name will be used as the signature.` : "Add a profile later if you want the message to auto-sign."}</p>
                    <textarea id="card-message-area" class="w-full h-32 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-700 focus:outline-none focus:border-indigo-300" placeholder="Write your greeting...">${defaultGreeting}</textarea>
                    <button id="refine-btn" class="w-full py-3 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all">Refine with AI</button>
                    <button id="send-card-btn" class="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/20">
                        <i class="fa-solid fa-paper-plane text-indigo-300"></i> Send a Card
                    </button>
                </div>
            `;
            const area = modalBody.querySelector("#card-message-area");
            const refineBtn = modalBody.querySelector("#refine-btn");
            refineBtn.addEventListener("click", async () => {
                const currentValue = area.value;
                if (!groqApiKey) {
                    window.alert("Add a Groq API key in config.local.js to use AI refine.");
                    return;
                }
                area.value = "Refining with AI...";
                refineBtn.disabled = true;
                refineBtn.classList.add("opacity-50");
                try {
                    const response = await fetch(GROQ_API_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${groqApiKey}`
                        },
                        body: JSON.stringify({
                            model: "llama3-8b-8192",
                            messages: [
                                { role: "system", content: "You improve greeting cards. Return only the revised text." },
                                { role: "user", content: `Refine this greeting: ${currentValue}` }
                            ]
                        })
                    });
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        area.value = data.choices[0].message.content.trim();
                    } else {
                        area.value = currentValue;
                    }
                } catch (error) {
                    area.value = currentValue;
                }
                refineBtn.disabled = false;
                refineBtn.classList.remove("opacity-50");
            });
            modalBody.querySelector("#send-card-btn").addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(area.value);
                } catch (error) {
                    // Clipboard is optional for this dummy flow.
                }
                window.open(CARD_LIBRARY_URL, "_blank");
            });
        }
        showModal();
    }

    function showModal() {
        modalBackdrop.classList.remove("opacity-0", "pointer-events-none");
        setTimeout(() => {
            modal.classList.remove("scale-95", "opacity-0");
            modal.classList.add("scale-100", "opacity-100");
        }, 20);
    }

    function closeModal() {
        modal.classList.remove("scale-100", "opacity-100");
        modal.classList.add("scale-95", "opacity-0");
        setTimeout(() => modalBackdrop.classList.add("opacity-0", "pointer-events-none"), 200);
    }

    modalBackdrop.addEventListener("click", (event) => {
        if (event.target === modalBackdrop) closeModal();
    });
    modalCloseBtn.addEventListener("click", closeModal);

    prevMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextMonthBtn.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    todayBtn.addEventListener("click", () => {
        currentDate = new Date();
        renderCalendar(currentDate);
    });

    profileBtn.addEventListener("click", renderProfileModal);

    syncProfileButton();
    renderCalendar(currentDate);
});
