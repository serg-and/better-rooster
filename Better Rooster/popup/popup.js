const wrapper = document.getElementById("wrapper");
const eventsWrapper = document.getElementById("events-wrapper");
const settingsWrapper = document.getElementById("settings-wrapper");

const refreshBtn = document.getElementById("refreshBtn").addEventListener("click", refreshCalender);
const settingsBtn = document.getElementById("settingsBtn").addEventListener("click", openSettings);
const cancelBtn = document.getElementById("cancelBtn").addEventListener("click", closeSettings);
const deleteBtn = document.getElementById("deleteBtn").addEventListener("click", deleteSettings);
const saveBtn = document.getElementById("saveBtn").addEventListener("click", saveSettings);
const calenderUrlField = document.getElementById("calenderUrlField");

var port = chrome.runtime.connect({name: "background.js"});
port.postMessage({request: "get data"});
port.onMessage.addListener(function(msg) {
    if (msg.answer === "reply data") showData(msg.data);
    if (msg.answer === 'data error') showNoUrlSet(msg.error);
    if (msg.answer === "settings saved") showData(msg.data);
    if (msg.answer === 'url error') showNoUrlSet(msg.error);
});

function showData(data) {
    eventsWrapper.innerHTML = '';
    calenderUrlField.value = data['url'];
    var events = data["events"];
    eventsWrapper.appendChild(document.createElement('br'))

    if (data['url'] === '') {
        eventsWrapper.innerHTML = `
            <br><hr>
            <h5>No calender link set</h5>
            <a>Enter a valid calender link in the settings</a>    
        `
        return
    } else if (events.length === 0) {
        eventsWrapper.innerHTML = `
            <br><hr>
            <h5>Calender empty</h5>
            <a>Make sure calender link is valid</a>    
        `
        return
    }

    var current = new Date();
    var last = new Date(1970, 0, 1);

    for (let i = 0; i < events.length; i++) {
        var start = new Date(events[i]['dtstart']);
        var end = new Date(events[i]['dtend']);

        if (end < current) continue

        if (!isSameDay(last, start)) {
            if (!(last.getWeekNumber() === start.getWeekNumber())) {
                var weekNr = `week ${start.getWeekNumber()}`;
                eventsWrapper.append(document.createElement("hr"))
            } else {
                var weekNr = '';
            }

            var dayDiv = document.createElement("div");
            dayDiv.className = 'day';
            dayDiv.innerHTML = `
                <a class="day-name">${start.toLocaleDateString(undefined, {weekday: 'long'})}</a>
                <div class="day-week-number">${weekNr}</div>
                <a class="day-date">${start.toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}</a>
            `;
            eventsWrapper.append(dayDiv);

            last = start;
        }

        var eventDiv = document.createElement('div');
        eventDiv.className = 'event';

        if (events[i]['location'] === '' && events[i]['description'].includes('Online')) {
            var location = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 768 768" class="GNFAPLFBPU">
                <path d="M384 31.5q120 0 204 84.75t84 203.25v321q0 39-28.5 67.5t-67.5 28.5h-192v-64.5h223.5v-31.5h-127.5v-256.5h127.5v-64.5q0-93-65.25-158.25t-158.25-65.25-158.25 65.25-65.25 158.25v64.5h127.5v256.5h-96q-39 0-67.5-28.5t-28.5-67.5v-225q0-118.5 84-203.25t204-84.75z"></path>
                </svg> online`;
        } else {
            var location = events[i]['location'];
        }

        eventDiv.innerHTML = `
            <div class=eventCol1>
                <b class="timeStart">${start.getHours()}.${doubleDigit(start.getUTCMinutes())}</b>
                <a class="timeEnd">${end.getHours()}.${doubleDigit(end.getUTCMinutes())}</a>
            </div>
            <div class=eventCol2>
                <b>${events[i]['summary']}</b>
                <hr>
                <a>${location}</a>
            </div>
        `;
        eventsWrapper.appendChild(eventDiv);
    }
    eventsWrapper.appendChild(document.createElement('hr'))
}

function showNoUrlSet(err) {
    eventsWrapper.innerHTML = `
        <br><hr>
        <h5>Invalid calender link</h5>
        <a>Enter a valid calender link in the settings</a>    
    `
}

function refreshCalender() {
    port.postMessage({request: "refresh data"});
}

function openSettings() {
    eventsWrapper.style.display = 'none';
    settingsWrapper.style.display = 'block';
}

function closeSettings() {
    settingsWrapper.style.display = 'none';
    eventsWrapper.style.display = 'block';
}

function saveSettings() {
    port.postMessage({
        request: "save settings",
        url: calenderUrlField.value
    });

    settingsWrapper.style.display = 'none';
    eventsWrapper.style.display = 'block';
}

function deleteSettings() {
    calenderUrlField.value = '';
}

function doubleDigit(date) {
    if (date > 9) return date;
    
    return '0' + date;
}

function isSameDay(date1, date2) {
    return date1.getDate() == date2.getDate() &&
        date1.getMonth() == date2.getMonth() &&
        date1.getFullYear() == date2.getFullYear()
}

Date.prototype.getWeekNumber = function(){
    var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};