console.log("ooh ello");

var heditors = [];

var filters = [];
var filtersDict = {};
var perspectiveNubs = [175, 156, 496, 55, 161, 279, 504, 330];

function Filter(name, id, init, update) {
	this.id = id;
	this.name = name;
	this.update = update;
	this.sliders = [];
	this.nubs = [];
	init.call(this);

	filters.push(this);
	filtersDict[id] = this;
}

Filter.prototype.addNub = function(name, x, y) {
	this.nubs.push({ name: name, x: x, y: y });
};

Filter.prototype.addSlider = function(name, label, min, max, value, step) {
	this.sliders.push({ name: name, label: label, min: min, max: max, value: value, step: step });
};

function HEditor(editor, name){
	this.editor = editor;
	this.name = name;
	this.canvas = editor.view.ctx.canvas;
	this.$canvas = $(this.canvas);
	this.loading = Promise.resolve();
	this.$container = this.$canvas.parent();
	this.$container.addClass("heditor");

	var $html = $('\
<div class="extras">\
	<div class="preview">\
		<div class="placeholder"  style="width:160px; height:160px"></div>\
	</div>\
	<div>\
		<div style="display:inline-block;">\
			<input class="input" type="file" name="pic" accept="image/*">\
			<button class="reset" type="button">Reset</button>\
			<button class="apply" type="button">Apply Image + Filters</button>\
			<button class="applySrc" type="button">Apply Filters To Source</button>\
		</div>\
		\
		<div class="fx_properties">\
			<div>Filter:</div>\
			<div><select class="filters"></select></div>\
			<div class="filterSettings"></div>\
		</div>\
	</div>\
</div>\
');

	this.$preview = $html.find(".preview");
	this.$input = $html.find(".input");
	this.$applyButton = $html.find(".apply");
	this.$applySrcButton = $html.find(".applySrc");
	this.$resetButton = $html.find(".reset");
	this.$filters = $html.find(".filters");
	this.$filterSettings = $html.find(".filterSettings");

	this.$container.after($html);

	this.$nubsContainer = $("<div class='nubs'></div>");
	this.$preview.append(this.$nubsContainer);

	try {
		this.fxCanvas = fx.canvas();
	} catch (e) {
		alert(e);
		return;
	}
	var $placeholder = $html.find(".placeholder");
	var style = $placeholder.attr('style');
	$html.find(".placeholder").replaceWith(this.fxCanvas);
	$(this.fxCanvas).attr("style", style);

	this.$input.change(() => {
		var file = this.$input[0].files[0];
		if (!file)
			return;

		var reader = new FileReader();
		reader.onload = (e) => {
			this.loadImage(e.target.result);
		};
		reader.readAsDataURL(file);
	});

	this.$applyButton.click(() => {
		this.applyImage();
	})

	this.$applySrcButton.click(() => {
		this.applyToSource();
	})

	this.$resetButton.click(() => {
		this.reset();
	})

	// Create the filter selector
	var html = '';
	for (var k in filters) {
		var filter = filters[k];
		html += '<option value="'+filter.id+'">' + filter.name + '</option>';
	}
	this.$filters.html(html);
	this.$filters.change(() => {
		this.setFilter(this.$filters.val());
	});

	this.filter = filters[0];
	this.loadImage(img64);
	this.setFilter("brightnessContrast");

	heditors.push(this);
}

HEditor.prototype.setFilter = function(filterId) {
	this.loading.then(() => {
		if (this.$filters.val() != filterId) {
			this.$filters.val(filterId);
		}

		var filter = filtersDict[filterId];
		this.filter = filter;
		this.filterSettings = {};
		this.$filterSettings.empty();

		// Add a row for each slider
		filter.sliders.forEach((slider, i) => {
			var $sliderBlock = $('<div class="sliderBlock"><div>' + slider.label + ':</div><div class="slider"></div></div>');
			this.$filterSettings.append($sliderBlock);
			var $slider = $sliderBlock.find(".slider");
			var onchange = (event, ui) => {
				this.filterSettings[slider.name] = ui.value;
				this.updateFilter();
			};
			$slider.slider({
				slide: onchange,
				change: onchange,
				min: slider.min,
				max: slider.max,
				value: slider.value,
				step: slider.step
			});
			this.filterSettings[slider.name] = slider.value;
		});

		this.$nubsContainer.empty();

		filter.nubs.forEach((nub, i) => {
			var x = nub.x * this.$nubsContainer.width();
			var y = nub.y * this.$nubsContainer.height();
			var nub_pt = this.filterSettings[nub.name] = {x:x / this.canvasScale.x, y:y / this.canvasScale.y};
			var $nub = $('<div class="nub"></div>');
			this.$nubsContainer.append($nub);
			$nub.draggable({
				drag: (e, ui) => {
					//mouse_down = false;
					var offset = $(e.target.parentNode).offset();
					nub_pt.x = (ui.offset.left - offset.left) / this.canvasScale.x;
					nub_pt.y = (ui.offset.top - offset.top) / this.canvasScale.y;
					this.updateFilter();
				},
				containment: 'parent',
				scroll: false
			}).css({ left: x, top: y });

		});

		this.updateFilter();
	});
}

HEditor.prototype.loadImage = function(src) {
	this.loading = new Promise((resolve, reject) => {
		var $img = $('<img>', {src: src, crossOrigin: "anonymous"});
		$img.load(() => {
			this.setImage($img[0]);
			resolve();
		});
	});
}

HEditor.prototype.updateFilter = function() {
	this.canvasScale = { x: $(this.fxCanvas).width() / this.fxCanvas.width, y: $(this.fxCanvas).height() / this.fxCanvas.height };
	this.filter.update.call(this.filterSettings, this.fxCanvas, this.texture);
}

HEditor.prototype.setImage = function(image){
	this.image = image;
	this.texture = this.fxCanvas.texture(image);
	this.updateFilter();
}

HEditor.prototype.applyImage = function(){
	this.fxCanvas.update();
	this.editor.buffer.drawImage(this.fxCanvas,
		0, 0, this.fxCanvas.width, this.fxCanvas.height,
		0, 0, 256, 256
	);
}

HEditor.prototype.applyToSource = function(){
	this.texture = this.fxCanvas.texture(this.fxCanvas);
	this.fxCanvas.update();
	this.setFilter("brightnessContrast");
}

HEditor.prototype.reset = function(){
	this.texture = this.fxCanvas.texture(this.image);
	this.fxCanvas.update();
	this.setFilter("brightnessContrast");
}

//-------------------------------------------------

new Filter('Brightness / Contrast', 'brightnessContrast', function() {
	this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
	this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).brightnessContrast(this.brightness,this.contrast).update();
});
new Filter('Hue / Saturation', 'hueSaturation', function() {
	this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
	this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).hueSaturation(this.hue, this.saturation).update();
});
new Filter('Vibrance', 'vibrance', function() {
	this.addSlider('amount', 'Amount', -1, 1, 0.5, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).vibrance(this.amount).update();
});
new Filter('Denoise', 'denoise', function() {
	this.addSlider('exponent', 'Exponent', 0, 50, 20, 1);
}, function(canvas, texture) {
	canvas.draw(texture).denoise(this.exponent).update();
});
new Filter('Unsharp Mask', 'unsharpMask', function() {
	this.addSlider('radius', 'Radius', 0, 200, 20, 1);
	this.addSlider('strength', 'Strength', 0, 5, 2, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).unsharpMask(this.radius, this.strength).update();
});
new Filter('Noise', 'noise', function() {
	this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).noise(this.amount).update();
});
new Filter('Sepia', 'sepia', function() {
	this.addSlider('amount', 'Amount', 0, 1, 1, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).sepia(this.amount).update();
});
new Filter('Vignette', 'vignette', function() {
	this.addSlider('size', 'Size', 0, 1, 0.5, 0.01);
	this.addSlider('amount', 'Amount', 0, 1, 0.5, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).vignette(this.size, this.amount).update();
});

new Filter('Zoom Blur', 'zoomBlur', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).zoomBlur(this.center.x, this.center.y, this.strength).update();
});
new Filter('Triangle Blur', 'triangleBlur', function() {
	this.addSlider('radius', 'Radius', 0, 200, 50, 1);
}, function(canvas, texture) {
	canvas.draw(texture).triangleBlur(this.radius).update();
});
new Filter('Tilt Shift', 'tiltShift', function() {
	this.addNub('start', 0.15, 0.75);
	this.addNub('end', 0.75, 0.6);
	this.addSlider('blurRadius', 'Blur Radius', 0, 50, 15, 1);
	this.addSlider('gradientRadius', 'Gradient Radius', 0, 400, 200, 1);
}, function(canvas, texture) {
	canvas.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
});
new Filter('Lens Blur', 'lensBlur', function() {
	this.addSlider('radius', 'Radius', 0, 50, 10, 1);
	this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
	this.addSlider('angle', 'Angle', -Math.PI, Math.PI, 0, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).lensBlur(this.radius, this.brightness, this.angle).update();
});

new Filter('Swirl', 'swirl', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
	this.addSlider('radius', 'Radius', 0, 600, 200, 1);
}, function(canvas, texture) {
	canvas.draw(texture).swirl(this.center.x, this.center.y, this.radius, this.angle).update();
});
new Filter('Bulge / Pinch', 'bulgePinch', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
	this.addSlider('radius', 'Radius', 0, 600, 200, 1);
}, function(canvas, texture) {
	canvas.draw(texture).bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update();
});
/*new Filter('Perspective', 'perspective', function() {
	var w = 640, h = 425;
	this.addNub('a', perspectiveNubs[0] / w, perspectiveNubs[1] / h);
	this.addNub('b', perspectiveNubs[2] / w, perspectiveNubs[3] / h);
	this.addNub('c', perspectiveNubs[4] / w, perspectiveNubs[5] / h);
	this.addNub('d', perspectiveNubs[6] / w, perspectiveNubs[7] / h);
}, function(canvas, texture) {
	var before = perspectiveNubs;
	var after = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
	canvas.draw(texture).perspective([before], [after]).update();
});*/

new Filter('Ink', 'ink', function() {
	this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).ink(this.strength).update();
});
new Filter('Edge Work', 'edgeWork', function() {
	this.addSlider('radius', 'Radius', 0, 200, 10, 1);
}, function(canvas, texture) {
	canvas.draw(texture).edgeWork(this.radius).update();
});
new Filter('Hexagonal Pixelate', 'hexagonalPixelate', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('scale', 'Scale', 10, 100, 20, 1);
}, function(canvas, texture) {
	canvas.draw(texture).hexagonalPixelate(this.center.x, this.center.y, this.scale).update();
});
new Filter('Dot Screen', 'dotScreen', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
	this.addSlider('size', 'Size', 3, 20, 3, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).dotScreen(this.center.x, this.center.y, this.angle, this.size).update();
});
new Filter('Color Halftone', 'colorHalftone', function() {
	this.addNub('center', 0.5, 0.5);
	this.addSlider('angle', 'Angle', 0, Math.PI / 2, 0.25, 0.01);
	this.addSlider('size', 'Size', 3, 20, 4, 0.01);
}, function(canvas, texture) {
	canvas.draw(texture).colorHalftone(this.center.x, this.center.y, this.angle, this.size).update();
});

//hog-mod 1.0.0

var img64 = (function(){
	return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAICCAMAAACOboXDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowNjgwMTE3NDA3MjA2ODExOTdBNUJENUNBRDA2Nzk5RCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowQTE1N0VBNTAzODYxMUU3Qjg0RjhFNTExMzQ1OUY2QSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowQTE1N0VBNDAzODYxMUU3Qjg0RjhFNTExMzQ1OUY2QSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1LjEgTWFjaW50b3NoIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDk4MDExNzQwNzIwNjgxMTk3QTVCRDVDQUQwNjc5OUQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDY4MDExNzQwNzIwNjgxMTk3QTVCRDVDQUQwNjc5OUQiLz4gPC9yZGY6RGVzY3Jp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";
})();
var $title = $("body>div>div>a").first();
$title.html("Image-to-Image Demo<br>(hog-mod-1.0.0)");
$author = $title.parent().next().next();
$author.html($author.html()+'<br><span style="font-style:italic;text-align:center;">Improved by </span><span style="font-style:italic;text-align:center;"><a href="http://www.cookdandbombd.co.uk/forums/index.php?action=profile;u=9816">hedgehog90</a></span> — <span style="font-family:Georgia, serif;font-style:italic;"><span>March 7<sup style="font-size:10px;margin-left:1px;margin-right:-6px;">th</sup>, 2017</span></span>');
$author.css({"line-height":"30px"});

var heditors = [];
for (var k in editors) {
	new HEditor(editors[k], k);
}