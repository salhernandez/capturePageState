chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === "LoadData") {
            evidence = JSON.parse(request.evidence);
            console.log(evidence);
            for (key in evidence["local_storage"]) {
                localStorage.setItem(key, evidence["local_storage"][key]);
            }
            window.location = evidence["url"];
            sendResponse({ response: "Logged in" });
        }
        return true;
    }
);