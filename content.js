valid_navigator_keys = [
	"productSub",
	"vendor",
	"cookieEnabled",
	"appVersion",
	"platform",
	"userAgent"
]

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.action === "getBrowserData") {
			var keyCount = localStorage.length;
			var localStorageObject = {}
		
			for (var index = 0; index < keyCount; index++) {
				key = localStorage.key(index);
				localStorageObject[key] = localStorage.getItem(key);
			}

			var navigatorObject = {};
			
			for (var key in navigator) {
				if (valid_navigator_keys.indexOf(key) >= 0) {
					navigatorObject[key] = navigator[key];
				}
			}
			
			browserData = {
				local_storage: localStorageObject,
				browser_data: navigatorObject
			}

			sendResponse(browserData);
		} 
		return true;
		}
	);
