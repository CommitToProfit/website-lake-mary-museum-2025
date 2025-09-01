// Supabase configuration
const SUPABASE_URL = 'https://xpvfzipjxjitzgkrexju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdmZ6aXBqeGppdHpna3JleGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODcxMDEsImV4cCI6MjA3MjA2MzEwMX0.kIZ3XY0Yn_kY_e3kUlhOfEFrUqCINzzuB5RHfIW2Aeo';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentTab = 'all';
let isAdminLoggedIn = false;
let currentUser = null;
let events = [];

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.role === 'admin') {
        isAdminLoggedIn = true;
        currentUser = user;
        document.getElementById('adminPanel').style.display = 'block';
    }

    await loadEvents();
    generateCalendar();
    updateEventsList();

    // Initialize event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('adminForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('addEventForm').addEventListener('submit', handleAddEvent);

    // Close modal when clicking outside
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            const user = session?.user;
            if (user && user.user_metadata?.role === 'admin') {
                isAdminLoggedIn = true;
                currentUser = user;
                document.getElementById('adminPanel').style.display = 'block';
                updateEventsList();
            }
        } else if (event === 'SIGNED_OUT') {
            isAdminLoggedIn = false;
            currentUser = null;
            document.getElementById('adminPanel').style.display = 'none';
            updateEventsList();
        }
    });

    // Set up real-time subscriptions
    supabase
        .channel('events')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'events' 
            }, 
            async (payload) => {
                console.log('Real-time update:', payload);
                await loadEvents();
                generateCalendar();
                updateEventsList();
            }
        )
        .subscribe();
}

// Load events from Supabase
async function loadEvents() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        
        events = data || [];
        console.log('Loaded events:', events);
    } catch (error) {
        console.error('Error loading events:', error);
        showError('Failed to load events from database');
    }
}

// SECURE Admin login using Supabase Auth
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Use Supabase's built-in authentication
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Check if user has admin role
        const user = data.user;
        console.log('User data:', user);
        
        if (user && user.user_metadata?.role === 'admin') {
            isAdminLoggedIn = true;
            currentUser = user;
            document.getElementById('adminPanel').style.display = 'block';
            closeModal('adminModal');
            updateEventsList();
            showSuccess('Admin login successful!');
        } else {
            throw new Error('Insufficient permissions - admin role required');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed: ' + error.message, 'login-error');
    }
}

// SECURE Add new event
async function handleAddEvent(e) {
    e.preventDefault();
    
    // Check authentication status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'admin') {
        showError('You must be logged in as an admin to add events');
        return;
    }

    const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value || '10:00 AM - 4:00 PM',
        location: document.getElementById('eventLocation').value || 'Museum Gallery',
        type: document.getElementById('eventType').value
    };

    try {
        // The RLS policies will automatically check if user is authenticated
        const { data, error } = await supabase
            .from('events')
            .insert([eventData])
            .select()
            .single();

        if (error) throw error;

        events.push(data);
        closeModal('addEventModal');
        generateCalendar();
        updateEventsList();
        showSuccess('Event added successfully!');
        document.getElementById('addEventForm').reset();
    } catch (error) {
        console.error('Error adding event:', error);
        showError('Failed to add event: ' + error.message, 'event-error');
    }
}

// SECURE Delete event
async function deleteEvent(eventId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'admin') {
        showError('You must be logged in as an admin to delete events');
        return;
    }

    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        // RLS policies will check authentication
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) throw error;

        events = events.filter(event => event.id !== eventId);
        generateCalendar();
        updateEventsList();
        closeModal('eventModal');
        showSuccess('Event deleted successfully!');
    } catch (error) {
        console.error('Error deleting event:', error);
        showError('Failed to delete event: ' + error.message);
    }
}

// SECURE Logout
async function logout() {
    try {
        await supabase.auth.signOut();
        isAdminLoggedIn = false;
        currentUser = null;
        document.getElementById('adminPanel').style.display = 'none';
        updateEventsList();
        showSuccess('Logged out successfully!');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Calendar functions
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
        let eventDetails = `<h3>Events on ${formatDate(date)}</h3>`;
        dayEvents.forEach(event => {
            eventDetails += `
                <div style="padding: 1rem; border: 1px solid #ecf0f1; border-radius: 5px; margin: 1rem 0;">
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
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function updateEventsList() {
    const eventsSection = document.getElementById('events');
    let filteredEvents = events;
    
    if (currentTab !== 'all') {
        filteredEvents = events.filter(event => event.type === currentTab);
    }
    
    // Show events for current month
    const monthEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });
    
    let html = '';
    if (monthEvents.length === 0) {
        html = `
            <div class="event-card">
                <h3>No events this month</h3>
                <p>Check other months or ${isAdminLoggedIn ? 'add new events using the admin panel.' : 'check back later for updates.'}</p>
            </div>
        `;
    } else {
        monthEvents.forEach(event => {
            html += `
                <div class="event-card" onclick="showEventDetails(${event.id})">
                    <span class="event-type ${event.type}">${event.type === 'upcoming' ? 'Upcoming Event' : 'Historical Event'}</span>
                    <h3>${event.title}</h3>
                    <div class="event-date">${formatDate(event.date)}</div>
                    <div class="event-description">${event.description.length > 150 ? event.description.substring(0, 150) + '...' : event.description}</div>
                    ${isAdminLoggedIn ? `<button onclick="deleteEvent(${event.id}); event.stopPropagation();" class="delete-btn">Delete</button>` : ''}
                </div>
            `;
        });
    }
    
    eventsSection.innerHTML = html;
}

function showEventDetails(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventDetails = `
        <h3>${event.title}</h3>
        <div style="padding: 1rem; border: 1px solid #ecf0f1; border-radius: 5px;">
            <p><strong>Date:</strong> ${formatDate(event.date)}</p>
            <p><strong>Time:</strong> ${event.time}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Type:</strong> ${event.type === 'upcoming' ? 'Upcoming Event' : 'Historical Event'}</p>
            <p><strong>Description:</strong></p>
            <p>${event.description}</p>
            ${isAdminLoggedIn ? `<button onclick="deleteEvent(${event.id})" class="delete-btn" style="margin-top: 1rem;">Delete Event</button>` : ''}
        </div>
    `;
    
    document.getElementById('eventDetails').innerHTML = eventDetails;
    document.getElementById('eventModal').style.display = 'block';
}

// Modal functions
function showAdminLogin() {
    document.getElementById('adminModal').style.display = 'block';
}

function showAddEventModal() {
    if (!isAdminLoggedIn) {
        showError('You must be logged in as an admin to add events');
        return;
    }
    document.getElementById('addEventModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Clear any error messages
    const errorDivs = document.querySelectorAll('#login-error, #event-error');
    errorDivs.forEach(div => div.innerHTML = '');
}

// Utility functions
function showError(message, containerId = null) {
    if (containerId) {
        document.getElementById(containerId).innerHTML = `<div class="error">${message}</div>`;
    } else {
        // Create a temporary error message at the top of the page
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translateX(-50%)';
        errorDiv.style.zIndex = '9999';
        errorDiv.style.maxWidth = '80%';
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.left = '50%';
    successDiv.style.transform = 'translateX(-50%)';
    successDiv.style.zIndex = '9999';
    successDiv.style.maxWidth = '80%';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
        }
    }, 3000);
}