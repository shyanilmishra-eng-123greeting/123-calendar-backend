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
    let groqApiKey = "";
    let unsplashApiKey = "";
    
    fetch("env.txt?t=" + new Date().getTime(), { cache: "no-store" })
        .then(res => {
            if (!res.ok) return fetch(".env?t=" + new Date().getTime(), { cache: "no-store" }).then(r => r.ok ? r.text() : "");
            return res.text();
        })
        .then(text => {
            const lines = text.split('\n');
            lines.forEach(line => {
                const matchGroq = line.match(/GROQ_API_KEY\s*=\s*(.*)/);
                if (matchGroq && matchGroq[1]) {
                    groqApiKey = matchGroq[1].trim();
                }
                const matchUnsplash = line.match(/unsplash_Access_Key\s*=\s*(.*)/);
                if (matchUnsplash && matchUnsplash[1]) {
                    unsplashApiKey = matchUnsplash[1].trim();
                }
            });
        })
        .catch(() => console.warn("Could not load env file"));

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
        "2026-04-01": [{ title: "Passover" }, { title: "National Fun Day" }, { title: "April Fools' Day" }, { title: "Laugh Week" }],
        "2026-04-02": [{ title: "Great Lovers Day" }, { title: "Hanuman Jayanti" }],
        "2026-04-03": [{ title: "Good Friday" }],
        "2026-04-05": [{ title: "Easter" }, { title: "National Caramel Day" }],
        "2026-04-06": [{ title: "Caramel Popcorn Day" }],
        "2026-04-07": [{ title: "World Health Day" }, { title: "National Beer Day" }, { title: "Coffee Cake Day" }],
        "2026-04-10": [{ title: "Hug Your Dog Day" }],
        "2026-04-11": [{ title: "National Cheese Fondue Day" }, { title: "National Pet Day" }],
        "2026-04-12": [{ title: "Orthodox Easter" }],
        "2026-04-13": [{ title: "National Scrabble Day" }, { title: "Songkran (Thailand)" }],
        "2026-04-14": [{ title: "Baisakhi" }, { title: "Tamil New Year" }],
        "2026-04-15": [{ title: "Bengali New Year" }, { title: "Malayalam New Year" }, { title: "Tax Day" }],
        "2026-04-17": [{ title: "National Cheeseball Day" }],
        "2026-04-19": [{ title: "National Garlic Day" }, { title: "National Amaretto Day" }],
        "2026-04-21": [{ title: "National Tea Day" }],
        "2026-04-22": [{ title: "April Showers Day" }, { title: "Administrative Professionals Day" }, { title: "Earth Day" }],
        "2026-04-23": [{ title: "German Beer Day" }, { title: "World Book Day" }, { title: "National Picnic Day" }, { title: "St. George's Day" }],
        "2026-04-24": [{ title: "National Arbor Day" }],
        "2026-04-26": [{ title: "World Intellectual Property Day" }],
        "2026-04-28": [{ title: "National Blueberry Pie Day" }],
        "2026-04-29": [{ title: "Dance Day" }],
        "2026-04-30": [{ title: "Oatmeal Cookie Day" }]
    };

    const imageCache = {};
    let cyclingIntervals = [];

    async function getEventImage(eventName) {
        if (imageCache[eventName]) return imageCache[eventName];
        if (!unsplashApiKey) return getFallback(eventName);
        try {
            let res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(eventName)}&client_id=${unsplashApiKey}&per_page=1`);
            let data = await res.json();
            if (data.results && data.results.length > 0) {
                const imgUrl = data.results[0].urls.regular;
                imageCache[eventName] = imgUrl;
                return imgUrl;
            }
            const broaderTerm = eventName.split(' ')[0] + ' celebration';
            res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(broaderTerm)}&client_id=${unsplashApiKey}&per_page=1`);
            data = await res.json();
            if (data.results && data.results.length > 0) {
                const imgUrl = data.results[0].urls.regular;
                imageCache[eventName] = imgUrl;
                return imgUrl;
            }
        } catch (e) {
            console.error("Unsplash API error:", e);
        }
        return getFallback(eventName);
    }

    function getFallback(eventName) {
        const uniqueNumber = Math.abs(eventName.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 1000;
        const uniqueFallback = `https://picsum.photos/seed/${uniqueNumber}/400/400`;
        imageCache[eventName] = uniqueFallback;
        return uniqueFallback;
    }

    function clearCyclingIntervals() {
        cyclingIntervals.forEach(clearInterval);
        cyclingIntervals = [];
    }

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
        clearCyclingIntervals();
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
            const dayEvents = events[dateStr] || [];
            const isToday = (
                day === realToday.getDate() &&
                month === realToday.getMonth() &&
                year === realToday.getFullYear()
            );
            const tile = document.createElement("div");
            const hasEventClass = dayEvents.length > 0 ? " has-event" : "";
            tile.className = `cal-tile flex flex-col p-3 sm:p-4${isToday ? " is-today" : ""}${hasEventClass} overflow-hidden relative`;

            const topEvt = dayEvents.length > 0 ? dayEvents[0] : null;

            tile.innerHTML = `
                ${topEvt ? `
                    <img id="img-${dateStr}" src="${getFallback(topEvt.title)}" alt="${topEvt.title}" class="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 hover:scale-105" onerror="this.style.display='none'">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5 z-0 pointer-events-none"></div>
                ` : ""}
                <div class="flex items-start justify-between gap-3 relative z-10">
                    <span class="day-number text-sm font-black ${isToday ? "" : (topEvt ? "text-zinc-900 backdrop-blur-xl bg-white/70" : "text-zinc-600")}">${day}</span>
                    <span class="text-[10px] font-bold uppercase tracking-widest ${topEvt ? "text-white/90 drop-shadow-md" : "text-zinc-400"}">${dayNames[new Date(year, month, day).getDay()]}</span>
                </div>
                ${topEvt ? `
                    <div class="flex-grow flex flex-col justify-end relative z-10 w-full pb-8">
                        <div id="title-${dateStr}" class="text-xs sm:text-sm font-black text-white w-full uppercase tracking-wide leading-snug drop-shadow-lg">${topEvt.title}</div>
                    </div>
                ` : "<div class='flex-grow'></div>"}
                <div class="tile-actions relative z-10">
                    <button class="tile-action-btn btn-reminder ${topEvt ? '!bg-black/30 !text-white hover:!bg-black/50 backdrop-blur-md border border-white/20' : '!bg-green-50/80 !text-green-600 hover:!bg-green-100'}" title="Remind in WhatsApp" data-date="${dateStr}">
                        <i class="fa-brands fa-whatsapp font-bold text-[15px]"></i>
                    </button>
                    <button class="tile-action-btn btn-greeting ${topEvt ? '!bg-black/30 !text-white hover:!bg-black/50 backdrop-blur-md border border-white/20' : '!bg-amber-50/80 !text-amber-600 hover:!bg-amber-100'}" title="Craft Greeting" data-date="${dateStr}">
                        <i class="fa-solid fa-pen-nib text-[13px]"></i>
                    </button>
                </div>
            `;

            if (dayEvents.length > 0) {
                const imgEl = tile.querySelector(`#img-${dateStr}`);
                const titleEl = tile.querySelector(`#title-${dateStr}`);
                
                getEventImage(dayEvents[0].title).then(url => {
                    if (imgEl) imgEl.src = url;
                });

                if (dayEvents.length > 1) {
                    let evtIndex = 0;
                    const intervalId = setInterval(async () => {
                        evtIndex = (evtIndex + 1) % dayEvents.length;
                        const nextEvt = dayEvents[evtIndex];
                        if (titleEl) titleEl.textContent = nextEvt.title;
                        const url = await getEventImage(nextEvt.title);
                        if (imgEl) imgEl.src = url;
                    }, 1000);
                    cyclingIntervals.push(intervalId);
                }
            }

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
        
        const todayStr = getDateString(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
        
        const upcomingEvents = Object.entries(events)
            .filter(([dateStr]) => dateStr >= todayStr)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(0, 5);

        if (!upcomingEvents.length) {
            list.innerHTML = `<p class="col-span-full py-8 text-center font-bold text-zinc-300 uppercase tracking-widest text-[10px]">No upcoming items.</p>`;
            return;
        }

        upcomingEvents.forEach(([dateStr, dayEventsArr]) => {
            const [y, m, d] = dateStr.split("-");
            const day = Number(d);
            const evtMonth = monthNames[Number(m) - 1];
            
            dayEventsArr.forEach(evt => {
                const cardId = `list-img-${dateStr}-${evt.title.replace(/\s+/g, '-')}`;
                const card = document.createElement("div");
                card.className = "flex items-center gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer";
                card.innerHTML = `
                    <div class="h-16 w-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden bg-zinc-50 border border-zinc-100 shadow-inner">
                        <img id="${cardId}" src="${getFallback(evt.title)}" alt="${evt.title}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow min-w-0">
                        <h4 class="text-[15px] font-black font-headline truncate text-zinc-900">${evt.title}</h4>
                        <p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mt-1">${evtMonth} ${String(day).padStart(2, "0")}</p>
                    </div>
                    <div class="flex gap-2.5 shrink-0">
                        <button class="list-whatsapp w-11 h-11 rounded-full bg-green-50/80 text-green-600 hover:bg-green-100 hover:scale-105 transition-all flex items-center justify-center shadow-sm" title="Remind in WhatsApp">
                            <i class="fa-brands fa-whatsapp text-lg"></i>
                        </button>
                        <button class="list-pen w-11 h-11 rounded-full bg-amber-50/80 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all flex items-center justify-center shadow-sm" title="Greeting">
                            <i class="fa-solid fa-pen-nib text-[15px]"></i>
                        </button>
                    </div>
                `;
                
                getEventImage(evt.title).then(url => {
                    const imgEl = card.querySelector(`#${cardId}`);
                    if (imgEl) imgEl.src = url;
                });

                card.querySelector(".list-whatsapp").addEventListener("click", (event) => {
                    event.stopPropagation();
                    openModal(dateStr, "reminder", evt);
                });
                card.querySelector(".list-pen").addEventListener("click", (event) => {
                    event.stopPropagation();
                    openModal(dateStr, "greeting", evt);
                });
                list.appendChild(card);
            });
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

    function openModal(dateStr, mode, specificEvt = null) {
        const dayEvents = events[dateStr] || [];
        const evt = specificEvt || (dayEvents.length > 0 ? dayEvents[0] : null);
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
                    window.alert("Add a GROQ_API_KEY in .env to use AI refine.");
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
