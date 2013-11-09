/* global $, _, CodeMirror, RJSON */
$(function () {
	"use strict";

	var fromTextareaEl = $("#area-from textarea");
	var toTextareaEl = $("#area-to textarea");
	var prettifyEl = $("#prettify-checkbox:checkbox");
	var relaxedEl = $("#relaxed-checkbox:checkbox");
	var tolerantEl = $("#tolerant-checkbox:checkbox");
	var duplicateEl = $("#duplicate-checkbox:checkbox");
	var errorsEl = $("#errors");

	var errorLineHandles = [];

	var cmFrom = CodeMirror.fromTextArea(fromTextareaEl[0], {
		mode: "javascript",
	});

	var cmTo = CodeMirror.fromTextArea(toTextareaEl[0], {
		mode: "javascript",
	});

	var fromCmEl = $("#area-from .CodeMirror");

	var checkboxes = [
		[prettifyEl, "prettify"],
		[relaxedEl, "relaxed"],
		[tolerantEl, "tolerant"],
		[duplicateEl, "duplicate"],
	];


	function loadCheckbox(el, cookieName) {
		var value = $.cookie(cookieName);
		if (value === "true") {
			el.prop("checked", true);
		} else if (value === "false") {
			el.prop("checked", false);
		}
	}

	function saveCheckbox(el, cookieName) {
		$.cookie(cookieName, el.is(":checked") ? "true" : "false");
	}

	function clearErrorLine() {
		errorLineHandles.forEach(function (h) {
			cmFrom.removeLineClass(h, "background", "error-line");
		});
	}

	function errorLines(ex) {
		if (!ex) {
			return [];
		} else if (ex.warnings && ex.warnings.length !== 0) {
			return _.pluck(ex.warnings, "line");
		} else if (ex.line) {
			return [ex.line];
		} else {
			return [];
		}
	}

	function transform() {
		// set selectors
		checkboxes.forEach(function (c) {
			saveCheckbox(c[0], c[1]);
		});

		var t;
		var v;
		try {
			errorsEl.html("");
			var i = cmFrom.getValue();
			t = RJSON.transform(i);
			v = RJSON.parse(i, {
				relaxed: relaxedEl.is(":checked"),
				tolerant: tolerantEl.is(":checked"),
				duplicate: duplicateEl.is(":checked"),
				warnings: true,
			});
			fromCmEl.removeClass("error");
			clearErrorLine();
		} catch (ex) {
			clearErrorLine();
			fromCmEl.addClass("error");
			var lines = errorLines(ex);
			if (lines.length !== 0) {
				errorLineHandles = _.uniq(lines.map(function (l) {
					return cmFrom.getLineHandle(l - 1);
				}));

				if (errorLineHandles.length !== 0) {
					errorLineHandles.forEach(function (h) {
						cmFrom.addLineClass(h, "background", "error-line");
					});
				}
			}

			errorsEl.html(ex.toString());
			if (ex && ex.warnings && ex.warnings.length > 1) {
				var ul = $("<ul>");
				ex.warnings.forEach(function (w) {
					ul.append($("<li>").html("Line " + w.line + ": " + w.message));
				});
				errorsEl.append(ul);
			}

			// when tolerant, we still get something
			if (ex && ex.obj) {
				v = ex.obj;
				t = JSON.stringify(v, null, 2);
			} else {
				return;
			}
		}

		if (prettifyEl.is(":checked")) {
			cmTo.setValue(v !== undefined ? JSON.stringify(v, null, 2) : t);
		} else {
			cmTo.setValue(t);
		}
	}

	// set selectors
	checkboxes.forEach(function (c) {
		loadCheckbox(c[0], c[1]);
	});

	// initial
	transform();

	// events
	prettifyEl.on("change", transform);
	relaxedEl.on("change", transform);
	tolerantEl.on("change", transform);
	duplicateEl.on("change", transform);
	cmFrom.on("change", transform);

	$("#expand-link").click(function (ev) {
		ev.preventDefault();
		$("article").addClass("show-more");
	});

	$("#collapse-link").click(function (ev) {
		ev.preventDefault();
		$("article").removeClass("show-more");
	});
});
