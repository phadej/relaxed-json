/* global $, CodeMirror, RJSON */
$(function () {
	"use strict";

	var fromTextareaEl = $("#area-from textarea");
	var toTextareaEl = $("#area-to textarea");
	var prettifyEl = $("#prettify-checkbox:checkbox");
	var relaxedEl = $("#relaxed-checkbox:checkbox");
	var tolerantEl = $("#tolerant-checkbox:checkbox");
	var duplicateEl = $("#duplicate-checkbox:checkbox");
	var errorsEl = $("#errors");

	var errorLineH;

	var cmFrom = CodeMirror.fromTextArea(fromTextareaEl[0], {
		mode: "javascript",
	});

	var cmTo = CodeMirror.fromTextArea(toTextareaEl[0], {
		mode: "javascript",
	});

	var fromCmEl = $("#area-from .CodeMirror");

	function clearErrorLine() {
		if (errorLineH) {
			cmFrom.removeLineClass(errorLineH, "background", "error-line");
		}
	}

	function transform() {
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
			fromCmEl.addClass("error");
			if (ex && ex.line) {
				clearErrorLine();
				errorLineH = cmFrom.getLineHandle(ex.line - 1);
				if (errorLineH) {
					cmFrom.addLineClass(errorLineH, "background", "error-line");
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
