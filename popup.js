// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Copyright (c) 2015 Jean-Martin Archer
// Use of this source code is governed by the MIT License found in LICENSE

function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = 'block'; }

function capturePage(cfg) {
	function createHiDPICanvas(cfg) {
		var canvas = document.createElement("canvas");
		var w = cfg.totalWidth + cfg.margins.left + cfg.margins.right;
		var h = cfg.totalHeight + cfg.margins.top + cfg.margins.bottom + cfg.titleBar.height;
		canvas.width = w * cfg.pixelRatio;
		canvas.height = h * cfg.pixelRatio;
		canvas.style.width = w + "px";
		canvas.style.height = h + "px";
		canvas.getContext("2d").setTransform(cfg.pixelRatio, 0, 0, cfg.pixelRatio, 0, 0);
		return canvas;
	}

	var canvas = createHiDPICanvas(cfg);
	var ctx = canvas.getContext('2d');

	chrome.tabs.captureVisibleTab(
		null, {format: 'png', quality: 100}, function(dataURI) {
			if (dataURI) {
				var image = new Image();
				var titleBarImage = new Image();
				titleBarImage.onload = function () {
					addTitleBar(ctx, titleBarImage, cfg);
				};
				titleBarImage.src = cfg.titleBar.data;
				image.onload = function() {
					var coords = {
						x: cfg.margins.left,
						y: cfg.margins.top + cfg.titleBar.height,
						w: cfg.totalWidth,
						h: cfg.totalHeight
					};
					ctx.drawImage(image, coords.x, coords.y, coords.w, coords.h);
					openScreenshotPage(canvas, cfg);
				};
				image.src = dataURI;
			}
		});

	function addTitleBar(ctx, titleBarImage, cfg) {
		var leftWidth = cfg.titleBar.leftWidth;
		var rightDx = cfg.margins.left + cfg.totalWidth - cfg.titleBar.rightWidth;
		var offset = cfg.titleBar.offset;

		var middleBar = {
			sx: offset, sy: 0,
			sw: 5, sh: leftWidth * 2,
			dx: cfg.margins.left + 5, dy: cfg.margins.top,
			dw: rightDx - cfg.margins.left, dh: leftWidth
		};
		var leftBar = {
			sx: 0, sy: 0,
			sw: offset * 2, sh: leftWidth * 2,
			dx: cfg.margins.left, dy: cfg.margins.top,
			dw: offset, dh: leftWidth
		};
		var rightBar = {
			sx: offset, sy: 0,
			sw: offset * 2, sh: leftWidth * 2,
			dx: rightDx, dy: cfg.margins.top,
			dw: offset, dh: leftWidth
		};

		addShadow(ctx, cfg);
		drawBar(ctx, titleBarImage, middleBar);
		drawBar(ctx, titleBarImage, leftBar);
		drawBar(ctx, titleBarImage, rightBar);
	}

	function drawBar(ctx, image, coords) {
		ctx.drawImage(image, coords.sx, coords.sy, coords.sw, coords.sh, coords.dx, coords.dy, coords.dw, coords.dh);
	}

	function addShadow(ctx, cfg) {
		ctx.save();
		var rect = {
			x: cfg.margins.left + cfg.shadow.edgeOffset,
			y: cfg.margins.top + cfg.shadow.edgeOffset,
			w: cfg.totalWidth - (cfg.shadow.edgeOffset * 2),
			h: cfg.totalHeight + cfg.titleBar.height - cfg.shadow.edgeOffset
		};
		ctx.rect(rect.x, rect.y, rect.w, rect.h);
		ctx.shadowColor = cfg.shadow.color;
		ctx.shadowBlur = cfg.shadow.blur;
		ctx.shadowOffsetX = cfg.shadow.offsetX;
		ctx.shadowOffsetY = cfg.shadow.offsetY;
		ctx.fill();
		ctx.restore();
	}
}

function dataUrlToBlob(dataURI) {
	// standard dataURI can be too big, let's blob instead
	// http://code.google.com/p/chromium/issues/detail?id=69227#c27
	var byteString = atob(dataURI.split(',')[1]);
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
	var ab = new ArrayBuffer(byteString.length);
	var ia = new Uint8Array(ab);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	return new Blob([ab], {type: mimeString});
}

function openScreenshotPage(canvas, cfg) {
	createFile(cfg, dataUrlToBlob(canvas.toDataURL()));

	function onwriteend() {
		// open the file that now contains the blob
		window.open('filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + cfg.filename);
		chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {width: cfg.originalWidth});
	}

	function errorHandler() {
		show('uh-oh');
	}

	function createFile(cfg, blob) {
		var size = blob.size + (1024/2);
		window.webkitRequestFileSystem(window.TEMPORARY, size, function (fs) {
			fs.root.getFile(cfg.filename, {create: true}, function (fileEntry) {
				fileEntry.createWriter(function (fileWriter) {
					fileWriter.onwriteend = onwriteend;
					fileWriter.write(blob);
				}, errorHandler);
			}, errorHandler);
		}, errorHandler);
	}
}

function generateFilename(url) {
	var name = url.split('?')[0].split('#')[0];
	if (name) {
		name = name
			.replace(/^https?:\/\//, '')
			.replace(/[^A-z0-9]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^[_\-]+/, '')
			.replace(/[_\-]+$/, '')
			.slice(0, 64);
		name = '-' + name;
	} else {
		name = '';
	}
	name = 'screenshot' + name + '-' + Date.now() + '.png';
	return name;
}

(function () {
	chrome.tabs.getSelected(null, function(tab) {
		// TODO-JMA enabled setZoom when Google Chrome 42 is released.
		// chrome.tabs.setZoom(tab.id, 1.0);
		var loaded = false;
		var PIXEL_RATIO = (function () {
			var ctx = document.createElement("canvas").getContext("2d"),
				dpr = window.devicePixelRatio || 1,
				bsr = ctx.webkitBackingStorePixelRatio ||
					ctx.backingStorePixelRatio || 1;

			return dpr / bsr;
		})();

		var cfg = {
			url: tab.url,
			filename: generateFilename(tab.url),
			targetWidth: 1280,
			totalWidth: null,
			totalHeight: null,
			pixelRatio: PIXEL_RATIO,
			originalWidth: tab.width,
			margins: {
				top: 15,
				bottom: 70,
				left: 40,
				right: 40
			},
			titleBar: {
				height: 36,
				leftWidth: 120,
				rightWidth: 18,
				offset: 130,
				data: 'data:image/png;base64,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'
			},
			shadow: {
				color: 'rgba(0, 0, 0, 0.5)',
				blur: 100,
				offsetX: 0,
				offsetY: 40,
				edgeOffset: 3 // shrinks the box generating the shadow so it doesn't show in the rounded the titleBar corners
			}
		};

		chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {width: cfg.targetWidth}, function() {
			chrome.tabs.get(tab.id, function(tab) {
				cfg.totalWidth = tab.width;
				cfg.totalHeight = tab.height;
				capturePage(cfg);
			});
		});
		// getting the tab again to get the new tab size.

		window.setTimeout(function() {
			if (!loaded) {
				show('uh-oh');
			}
		}, 1000);
	});
})();
