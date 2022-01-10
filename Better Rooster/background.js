const FETCH_INTERVAL = 3600000;   // 1 hour
const infoList = [
    "DTSTAMP:", 
    "DTSTART;",
    "DTEND;",
    "SUMMARY:",
    "LOCATION:",
    "STATUS:",
    "SEQUENCE:",
    "CREATED:",
    "LAST-MODIFIED:",
    "UID:",
    "TRANSP:"
];

var icsData = getIcs();

setInterval(function() {icsData = getIcs();}, FETCH_INTERVAL);

chrome.runtime.onConnect.addListener(function(port) {
    console.assert(port.name === "background.js");
    port.onMessage.addListener(function(msg) {
        if (msg.request === "get data") {
            icsData.then(
                res => port.postMessage({answer: "reply data", data: res}),
                err => port.postMessage({answer: "data error", error: err})
            );
        }
        if (msg.request === "save settings") {
            chrome.storage.sync.set({url: msg.url});
            icsData = getIcs();
            icsData.then(
                res => port.postMessage({answer: "settings saved", data: res}),
                err => port.postMessage({answer: "url error", error: err})
            );
        }
        if (msg.request === "refresh data") {
            icsData = getIcs();
            icsData.then(
                res => port.postMessage({answer: "reply data", data: res}),
                err => port.postMessage({answer: "data error", error: err})
            );
        }
    });
});

function getIcs() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['url'], res => {
            if (!res.url) {
                res.url = '';
            }

            fetchIcs(res.url)
                .then(ics => parseIcs(ics))
                .then(parsed => {
                    parsed['url'] = res.url  // add calender link to data
                    resolve(parsed)
                })
                .catch(err => reject(err));
        })
    })
}

function fetchIcs(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(res => res.blob())
            .then(blob => blob.text())
            .then(text => {
                resolve(text);
            })
            .catch(err => reject(err));
    })
}

function parseIcs(ics) {
    return new Promise(resolve => {
        var icsLines = ics.match(/[^\r\n]+/g);  // split text into lines
        var data = {};
        
        getEvents(icsLines)
            .then(events => data["events"] = events)

        resolve(data);
    })
}

function getEvents(icsLines) {
    return new Promise(resolve => {
        var events = [];
        var startEvent = 0;
        
        for (let i = 0; i < icsLines.length; i++) {
            if (icsLines[i] === "BEGIN:VEVENT") {
                startEvent = i + 1;
            } else if (icsLines[i] === "END:VEVENT") {
                parseEvent(icsLines.slice(startEvent, i))
                    .then(parsed => {
                        events.push(parsed);
                    })
            }
        }

        resolve(events);
    })
}

function parseEvent(event) {
    return new Promise(resolve => {
        var parsed = {};

        for (line in event) {
            if (event[line].includes('DTSTAMP:')) {parsed['dtstamp'] = stringToDate(event[line])}
            if (event[line].includes('DTSTART;')) {parsed['dtstart'] = stringToDate(event[line])}
            if (event[line].includes('DTEND;')) {parsed['dtend'] = stringToDate(event[line])}
            if (event[line].includes('SUMMARY:')) {parsed['summary'] = event[line].replace('SUMMARY:', '')}
            if (event[line].includes('LOCATION:')) {parsed['location'] = event[line].replace('LOCATION:', '')}
            if (event[line].includes('STATUS:')) {parsed['status'] = event[line].replace('STATUS:', '')}
            if (event[line].includes('SEQUENCE:')) {parsed['sequence'] = event[line].replace('SEQUENCE:', '')}
            if (event[line].includes('CREATED:')) {parsed['created'] = stringToDate(event[line])}
            if (event[line].includes('LAST-MODIFIED:')) {parsed['last-modified'] = stringToDate(event[line])}
            if (event[line].includes('UID:')) {parsed['uid'] = event[line].replace('UID:', '')}
            if (event[line].includes('TRANSP:')) {parsed['transp'] = event[line].replace('TRANSP:', '')}
        }

        var indexDescription = event.findIndex(element => element.includes("DESCRIPTION:"));  // index of description in event array
        
        if (indexDescription != -1) {
            parsed["description"] = event[indexDescription].replace("DESCRIPTION:", '')

            let i = 1;
            while (event[indexDescription + i][0] === " ") {
                parsed["description"] += event[indexDescription + i];
                i++;
            }
        }

        resolve(parsed);
    })
}

function stringToDate(string) {
    let time = string.split(":")[1].replace(/\D/g,'');  // remove parameter name and remove all non-digits
    let year = time.slice(0, 4);
    let month = time.slice(4, 6) - 1;
    let day = time.slice(6, 8);
    let hour = time.slice(8, 10);
    let minute = time.slice(10, 12);
    let second = time.slice(12, 14);

    return new Date(year, month, day, hour, minute, second)
}
