document.addEventListener("DOMContentLoaded", () => {
    // ---- DOM Elements ----
    const monthDisplay = document.getElementById("month-display");
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");
    
    // Modal Elements
    const modalBackdrop = document.getElementById("event-modal-backdrop");
    const modal = document.getElementById("event-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalDateDisplay = document.getElementById("modal-date");
    const modalBody = document.getElementById("modal-body");

    let currentDate = new Date(); // Start at today
    const realToday = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Professional Event Database
    const events = {
        "2026-04-01": { title: "April Fools' Day", type: "burgundy", icon: "fa-face-laugh-wink" },
        "2026-04-03": { title: "Emma's Birthday", type: "green", icon: "fa-cake-candles" },
        "2026-04-05": { title: "Easter Sunday", type: "burgundy", icon: "fa-egg" },
        "2026-04-10": { title: "National Siblings Day", type: "green", icon: "fa-people-group" },
        "2026-04-20": { title: "Anniversary", type: "burgundy", icon: "fa-heart" },
        "2026-04-22": { title: "Earth Day", type: "green", icon: "fa-earth-americas" }
    };

    // Styling Tokens
    const tileColors = [
        'bg-[#2D4A2D] text-white', // Green
        'bg-[#6B0001] text-white', // Burgundy
        'bg-[#D4C4A8] text-[#6B0001]', // Tan/Stone
        'bg-[#1E331E] text-white', // Darker Green
    ];

    function renderCalendar(date) {
        calendarGrid.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        monthDisplay.textContent = `${monthNames[month]} ${year}`;
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // 1. Padding
        for (let i = 0; i < firstDayOfMonth; i++) {
            const empty = document.createElement("div");
            empty.className = "aspect-square opacity-0 pointer-events-none";
            calendarGrid.appendChild(empty);
        }

        // 2. Main Grid
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDiv = document.createElement("div");
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const sysEvent = events[dateStr];
            const isToday = (d === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear());
            const rotation = ( ( (d * 7) % 10 ) - 5 ) / 5;
            const colorIdx = (d + month) % tileColors.length;
            const isDarkTile = [0, 1, 3].includes(colorIdx);
            
            dayDiv.className = `heirloom-tile aspect-square cursor-pointer rounded-[14px] sm:rounded-[24px] md:rounded-[40px] p-1 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center sm:justify-between shadow-lg sm:shadow-xl transition-all hover:z-20 ${tileColors[colorIdx]} bg-pattern border sm:border-4 border-white/10 overflow-hidden relative`;
            dayDiv.style.transform = window.innerWidth > 640 ? `rotate(${rotation}deg)` : 'none';
            
            dayDiv.innerHTML = `
                <div class="h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center rounded-full ${isToday && window.innerWidth < 640 ? 'bg-white text-heirloom-burgundy' : ''}">
                    <span class="text-xs sm:text-lg md:text-3xl font-black ${isDarkTile ? 'text-white' : 'text-heirloom-burgundy'} sm:opacity-40 leading-none">${d}</span>
                </div>
                
                <!-- Desktop Icons -->
                ${sysEvent ? `
                    <div class="hidden sm:flex flex-grow items-center justify-center py-0.5 md:py-1">
                        <i class="fa-solid ${sysEvent.icon} text-lg sm:text-2xl md:text-5xl ${isDarkTile ? 'text-white/90' : 'text-heirloom-burgundy/90'} filter drop-shadow-lg"></i>
                    </div>
                    <!-- Mobile Event Dot -->
                    <div class="block sm:hidden absolute bottom-1 h-1 w-1 rounded-full bg-white shadow-sm"></div>
                ` : ''}
            `;

            if (isToday) {
                if (window.innerWidth >= 640) {
                    dayDiv.classList.add("ring-[3px]", "sm:ring-[8px]", "ring-heirloom-burgundy", "ring-offset-[2px]", "sm:ring-offset-[10px]", "ring-offset-[#FEF9ED]");
                }
            }

            dayDiv.addEventListener("click", () => {
                dayDiv.classList.add('scale-95', 'opacity-70');
                setTimeout(() => {
                    dayDiv.classList.remove('scale-95', 'opacity-70');
                    openEventModal(d, sysEvent, date);
                }, 150);
            });
            calendarGrid.appendChild(dayDiv);
        }

        renderEventsList(date);
    }

    function renderEventsList(date) {
        const list = document.getElementById("upcoming-events-list");
        list.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthStr = String(month + 1).padStart(2, '0');
        
        const monthEvents = Object.entries(events).filter(([dStr]) => dStr.startsWith(`${year}-${monthStr}-`));

        if (monthEvents.length === 0) {
            list.innerHTML = `<p class="col-span-full py-10 text-center font-bold text-stone-300 uppercase tracking-widest text-[10px] sm:text-xs">No key occasions tracked for this month.</p>`;
            return;
        }

        monthEvents.sort().forEach(([dStr, evt]) => {
            const day = parseInt(dStr.split('-')[2]);
            const card = document.createElement("div");
            card.className = "flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] bg-heirloom-burgundy/5 border border-heirloom-burgundy/5 transition-all hover:bg-white hover:shadow-xl hover:scale-[1.02] group cursor-pointer";
            
            card.innerHTML = `
                <div class="h-12 w-12 sm:h-16 sm:w-16 shrink-0 bg-heirloom-burgundy text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform group-hover:-rotate-6 transition-transform">
                    <i class="fa-solid ${evt.icon} text-lg sm:text-2xl"></i>
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="text-base sm:text-xl font-black font-headline truncate tracking-tight text-heirloom-burgundy">${evt.title}</h4>
                    <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400 mt-0.5 sm:mt-1">${monthNames[month]} ${String(day).padStart(2, '0')}</p>
                </div>
                <button class="draft-btn h-10 sm:h-12 px-4 sm:px-5 bg-heirloom-burgundy text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                    Draft
                </button>
            `;

            card.querySelector('.draft-btn').onclick = (e) => {
                e.stopPropagation();
                openEventModal(day, evt, date);
            };
            card.onclick = () => openEventModal(day, evt, date);
            list.appendChild(card);
        });
    }

    // Featured Button Link
    const featuredBtn = document.getElementById("featured-draft-btn");
    if (featuredBtn) {
        featuredBtn.addEventListener("click", () => {
            const emmaDate = new Date(2026, 3, 3); // April 3
            const emmaEvent = events["2026-04-03"];
            openEventModal(3, emmaEvent, emmaDate);
        });
    }

    function openEventModal(day, evt, baseDate) {
        modalDateDisplay.textContent = `${monthNames[baseDate.getMonth()]} ${day}, ${baseDate.getFullYear()}`;
        modalTitle.textContent = evt ? evt.title : "Global Occasion";
        
        modalBody.innerHTML = `
            <div class="space-y-8">
                <!-- AI Assistant Section -->
                <div class="space-y-6">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <label class="font-black text-heirloom-burgundy text-xl tracking-tight font-headline">Craft a Greeting</label>
                        <div class="flex gap-2">
                            <button class="sentiment-btn px-4 py-2 rounded-xl bg-heirloom-burgundy/5 text-heirloom-burgundy font-black text-[10px] uppercase tracking-widest border border-heirloom-burgundy/10 hover:bg-heirloom-burgundy hover:text-white transition-all" data-mood="heartfelt">Heartfelt</button>
                            <button class="sentiment-btn px-4 py-2 rounded-xl bg-heirloom-burgundy/5 text-heirloom-burgundy font-black text-[10px] uppercase tracking-widest border border-heirloom-burgundy/10 hover:bg-heirloom-burgundy hover:text-white transition-all" data-mood="funny">Funny</button>
                        </div>
                    </div>
                    
                    <div class="relative group">
                        <textarea id="ai-draft-area" class="w-full h-32 p-6 rounded-[28px] border-4 border-slate-50 bg-slate-50/50 resize-none font-medium text-stone-700 leading-relaxed placeholder:text-stone-300 focus:outline-none focus:bg-white focus:shadow-xl transition-all" placeholder="Your personalized message..."></textarea>
                        <button id="ai-refine-btn" class="absolute bottom-4 right-4 bg-black text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hidden">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Refine
                        </button>
                    </div>
                </div>
 
                <!-- Primary Action -->
                <button class="w-full py-5 bg-heirloom-burgundy text-white rounded-[32px] font-black shadow-xl hover:bg-black hover:scale-[1.02] transition-all flex items-center justify-center gap-4 group">
                    <span class="text-lg">Send eCard</span>
                    <i class="fa-solid fa-paper-plane group-hover:translate-x-1 transition-transform"></i>
                </button>

                <!-- WhatsApp Sync -->
                <div class="pt-6 border-t border-stone-100 flex flex-col items-center">
                    <button class="flex items-center gap-3 text-[#25D366] font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
                        <i class="fa-brands fa-whatsapp text-xl"></i>
                        Sync to WhatsApp Reminder
                    </button>
                </div>
            </div>
        `;

        setupModalScripting();

        modalBackdrop.classList.remove("opacity-0", "pointer-events-none");
        setTimeout(() => {
            modal.classList.remove("scale-95", "opacity-0");
            modal.classList.add("scale-100", "opacity-100");
        }, 50);
    }

    function setupModalScripting() {
        const area = document.getElementById("ai-draft-area");
        const refineBtn = document.getElementById("ai-refine-btn");
        const sentiments = document.querySelectorAll(".sentiment-btn");
        
        sentiments.forEach(btn => {
            btn.addEventListener("click", () => {
                const mood = btn.dataset.mood;
                const texts = {
                    heartfelt: "Thinking of you on this special day. May your celebration be filled with peace, love, and light. Truly wonderful!",
                    funny: "Happy celebration! I considered sending a giant cake, but then I remembered my diet. So here's a lovely digital wish instead!"
                };
                area.value = texts[mood];
                refineBtn.classList.remove("hidden");
            });
        });

        area.addEventListener("input", () => {
            if(area.value.length > 5) refineBtn.classList.remove("hidden");
            else refineBtn.classList.add("hidden");
        });

        refineBtn.addEventListener("click", () => {
            const current = area.value;
            area.value = "AI Refining Magic...";
            setTimeout(() => {
                area.value = `Warmly yours: ${current.trim()} Wishing you the absolute best on this ${modalTitle.textContent}!`;
            }, 800);
        });
    }

    function closeModal() {
        modal.classList.remove("scale-100", "opacity-100");
        modal.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            modalBackdrop.classList.add("opacity-0", "pointer-events-none");
        }, 300);
    }

    modalBackdrop.addEventListener("click", (e) => {
        if(e.target === modalBackdrop) closeModal();
    });

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

    renderCalendar(currentDate);
});
