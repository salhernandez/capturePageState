// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var tabId = parseInt(window.location.search.substring(1));

var data = [];

window.addEventListener("load", function () {

    // use Log.enable and go from there
    chrome.debugger.sendCommand({ tabId: tabId }, "Log.enable");
    chrome.debugger.onEvent.addListener(onEvent);


    setTimeout(() => {
        let harBLOB = new Blob([JSON.stringify(data)]);

        let url = URL.createObjectURL(harBLOB);

        chrome.downloads.download({
            url: url
        });
    }, 3000);

});

window.addEventListener("unload", function () {
    chrome.debugger.sendCommand({ tabId: tabId }, "Log.disable");
    chrome.debugger.detach({ tabId: tabId });
});

var requests = {};

function onEvent(debuggeeId, message, params) {
    if (tabId != debuggeeId.tabId)
        return;

    var requestDiv = document.createElement("div");
    var urlLine = document.createElement("div");
    data.push(params)
    urlLine.textContent = JSON.stringify(debuggeeId) +"\n"+JSON.stringify(message) +"\n"+ JSON.stringify(params)+"\n";
    requestDiv.appendChild(urlLine);
    document.getElementById("container").appendChild(requestDiv);
}