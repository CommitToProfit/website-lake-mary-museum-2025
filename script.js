// Global state
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentTab = 'all';
let isAdminLoggedIn = false;

// Sample events data
let events = [
    {
        id: 1,
        date: '2025-08-15',
        title: 'Military Appreciation Day',
        type: 'upcoming',
        description: 'Join us for our annual Military Appreciation Day featuring exhibits, presentations, and activities honoring our local veterans and military history. Special guest speakers and military vehicle displays will be featured throughout the day.',
        location: 'Main Gallery',
        time: '10:00 AM - 4:00 PM'
    },
    {
        id: 2,
        date: '2025-07-18',
        title: 'Lake Mary Incorporation Anniversary',
        type: 'historical',
        description: 'On this day in 1970, Lake Mary was officially incorporated as a city. The small community had grown from a railroad stop to a thriving suburban town, marking the beginning of its modern era.',
        location: 'Historical Reference',
        time: 'All Day'
    },
    {
        id: 3,
        date: '2025-08-25',
        title: 'The Founding of Florida Exhibit Opening',
        type: 'upcoming',
        description: 'Our new summer exhibit exploring the early history of Florida and its impact on the Central Florida region. Features artifacts, interactive displays, and educational programs for all ages.',
        location: 'Special Exhibitions Hall',
        time: '9:00 AM - 5:00 PM'
    },
    {
        id: 4,
        date: '2025-08-04',
        title: 'Independence Day Celebration',
        type: 'upcoming',
        description: 'Celebrate America\'s birthday with historical presentations, colonial demonstrations, and patriotic activities for the whole family.',
        location: 'Museum Grounds',
        time: '11:00 AM - 3:00 PM'
    },
    {
        id: 5,
        date: '2025-08-12',
        title: 'Orange County Settlement Day',
        type: 'historical',
        description: 'Commemorating the day in 1845 when the first permanent settlers arrived in what would become Orange County, establishing the foundation for communities like Lake Mary.',
        location: 'Historical Reference',
        time: 'All Day'
    }
];

function generateCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    document.getElementById('current-month').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    
    // Header row
    dayNames.forEach(day => {
        html += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        
        const dayEvents = events.filter(event => {
            if (currentTab === 'all') return event.date === dateStr;
            return event.date === dateStr && event.type === currentTab;
        });
        
        let eventDots = '';
        dayEvents.forEach(event => {
            eventDots += `<div class="event-dot ${event.type}" title="${event.title}"></div>`;
        });
        
        html += `<div class="${dayClass}" onclick="showDayEvents('${dateStr}')">${day}${eventDots}</div>`;
    }
    
    document.getElementById('calendar-grid').innerHTML = html;
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
    updateEventsList();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.calendar-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    generateCalendar();
    updateEventsList();
}

function showDayEvents(date) {
    const dayEvents = events.filter(event => event.date === date);
    if (dayEvents.length > 0) {
        let eventDetails = '<h3>Events on ' + formatDate(date) + '</h3>';
        dayEvents.forEach(event => {
            eventDetails += `
                <div class="event-detail">
                    <h4>${event.title}</h4>
                    <p><strong>Type:</strong> ${event.type === 'upcoming' ? 'Upcoming Event' : 'Historical Event'}</p>
                    <p><strong>Time:</strong> ${event.time}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p><strong>Description:</strong> ${event.description}</p>
                    ${isAdminLoggedIn ? `<button onclick="deleteEvent(${event.id})" class="delete-btn">Delete Event</button>` : ''}
                </div>
            `;
        });
        document.getElementById('eventDetails').innerHTML = eventDetails;
        document.getElementById('eventModal').style.display = 'block';
    } else {
        document.getElementById('eventDetails').innerHTML = `
            <h3>No events on ${formatDate(date)}</h3>
            <p>No events scheduled for this date.</p>
            ${isAdminLoggedIn ? '<p><button onclick="showAddEventModal(); document.getElementById(\'eventDate\').value=\'' + date + '\'" class="admin-btn">Add Event for This Date</button></p>' : ''}
        `;
        document.getElementById('eventModal').style.display = 'block';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showAdminLogin() {
    document.getElementById('adminModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAddEventModal() {
    document.getElementById('addEventModal').style.display = 'block';
}

function updateEventsList() {
    const eventsSection = document.getElementById('events');
    let filteredEvents = events;
    
    if (currentTab !== 'all') {
        filteredEvents = events.filter(event => event.type === currentTab);
    }
    
    // Show events for current month
    const monthEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });
    
    let html = '';
    monthEvents.forEach(event => {
        html += `
            <div class="event-card" onclick="showEventDetails(${event.id})">
                <span class="event-type ${event.type}">${event.type === 'upcoming' ? 'Upcoming Event' : 'Historical Event'}</span>
                <h3>${event.title}</h3>
                <div class="event-date">${formatDate(event.date)}</div>
                <div class="event-description">${event.description.substring(0, 150)}...</div>
                ${isAdminLoggedIn ? `<button onclick="deleteEvent(${event.id}); event.stopPropagation();" class="delete-btn">Delete</button>` : ''}
            </div>
        `;
    });
    
    if (html === '') {
        html = '<div class="event-card"><h3>No events this month</h3><p>Check other months or add new events if you\'re an admin.</p></div>';
    }
    
    eventsSection.innerHTML = html;
}

function showEventDetails(eventId) {
    const event = events.find(e => e.id === eventId);
    if (event) {
        let eventDetails = `
            <h3>${event.title}</h3>
            <div class="event-detail">
                <p><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Type:</strong> ${event.type}</p>
                <p><strong>Description:</strong> ${event.description}</p>
                ${isAdminLoggedIn ? `<button onclick="deleteEvent(${event.id})" class="delete-btn">Delete Event</button>` : ''}
            </div>
        `;
        document.getElementById('eventDetails').innerHTML = eventDetails;
        document.getElementById('eventModal').style.display = 'block';
    }
}

function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        events = events.filter(e => e.id !== eventId);
        generateCalendar();
        updateEventsList();
        closeModal('eventModal');
        alert('Event deleted successfully!');
    }
}

function logout() {
    isAdminLoggedIn = false;
    document.getElementById('adminPanel').style.display = 'none';
    document.querySelector('.admin-login').style.display = 'block';
    generateCalendar();
    updateEventsList();
    alert('Successfully logged out');
}

// Event listeners
document.getElementById('adminForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'admin' && password === 'museum123') {
        isAdminLoggedIn = true;
        document.getElementById('adminPanel').style.display = 'block';
        document.querySelector('.admin-login').style.display = 'none';
        closeModal('adminModal');
        generateCalendar();
        updateEventsList();
        
        document.getElementById('adminForm').reset();
        alert('Successfully logged in as administrator');
    } else {
        alert('Invalid credentials. Please check your username and password.');
        document.getElementById('password').value = '';
    }
});

document.getElementById('addEventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const type = document.getElementById('eventType').value;
    
    if (!title || !description || !date || !type) {
        alert('Please fill in all required fields.');
        return;
    }
    
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (type === 'upcoming' && eventDate < today) {
        if (!confirm('This date is in the past. Are you sure you want to add this as an upcoming event?')) {
            return;
        }
    }
    
    const newEvent = {
        id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
        title: title,
        description: description,
        date: date,
        type: type,
        location: type === 'historical' ? 'Historical Reference' : 'Museum Gallery',
        time: type === 'historical' ? 'All Day' : '10:00 AM - 4:00 PM'
    };
    
    events.push(newEvent);
    generateCalendar();
    updateEventsList();
    closeModal('addEventModal');
    
    document.getElementById('addEventForm').reset();
    alert(`Event "${title}" has been successfully added!`);
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Initialize calendar and events on page load
document.addEventListener('DOMContentLoaded', function() {
    generateCalendar();
    updateEventsList();
});
