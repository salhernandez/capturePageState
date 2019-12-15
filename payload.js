console.log("bruh we made it")

// send the page title as a chrome message

// remember original console.log
var origLog = console.log;
// here, the contents of console.log will be stored
var consoleBuffer = [];

// replace console.log with own function
console.log = function () {
   var args = Array.prototype.slice.call(arguments);

   // I would not store an infinite amount of entries,
   // so remove oldest one if 10 stored
   if (consoleBuffer.length === 10) consoleBuffer.pop();

   // remember
   consoleBuffer.push(args);

   // call original function
   origLog.apply(console, args);

   //    send info (arguments back to popup.html/js via message). 
};

console.log('foo');
var err = 'unknown error';
console.log('An error occured: ', err);
// use warn since this was not replaced
console.warn(consoleBuffer);


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      sendResponse(consoleBuffer);
});