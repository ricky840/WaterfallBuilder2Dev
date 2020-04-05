$(document).ready(function() { 

	tableInitializer.init();

	// Init Loading Indicator Bar
	loadingIndicator.init($("#loader-bar"));

	// Hide line item bar first
	$("#add-adsource").trigger('click');

	// Load AdUnits
	adUnitManager.loadAdUnits("list-name-id", function(adUnitList) {
		if (adUnitList) {
			$("#info-adunit-name").html("Please select ad unit");
			let input = $("#adunit-selector")[0];
			let menuAdUnitTagify = new Tagify(input, {
				mode: "select",
				enforceWhitelist: true,
				whitelist: adUnitList,
				keepInvalidTags: false,
				placeholder: "Search ad unit..",
				skipInvalid: true,
				dropdown: {
					position: "all",
					maxItems: Infinity,
					closeOnSelect: true
				}
			});
			menuAdUnitTagify.on('add', function(e) {
				let selectedValue = e.detail.data.value;
				let adUnitId = selectedValue.match(/.*\(([0-9|a-z]{32})\).*/)[1];
				AdUnitName = selectedValue.match(/.*<unitname>(.*)<\/unitname>.*/)[1];
				console.log(`Loading waterfall for ad unit ${selectedValue}`);
				loadWaterfall(adUnitId, function() {
					$(".button, .search-table-wrapper").removeClass('disabled');
					console.log("Eanbling all buttons");
				});
			});
		}
	});

	// Load Account Info
	accountManager.updateHtmlEmail();

	// Version Update
	$(".wb-version").html(`v${chrome.runtime.getManifest().version}`);	

	// Column Selector
	let colDefs = WaterfallTable.getColumnDefinitions(); // Get column definition array
	for(let i =0; i < colDefs.length; i++) {
		if (colDefs[i]["field"]) {
			let checked = colDefs[i].visible == true ? "checked" : "";
			let html = ` 
			<div class="ui item checkbox tiny" data-value="${colDefs[i].field}">
        <input type="checkbox" name="${colDefs[i].field}" ${checked}>
        <label>${colDefs[i].title}</label>
      </div>`;
			$(".column.scrolling.menu").append(html);
		}
	}

	// Column Select
	$("#column-selector").dropdown({
		action: function(text, value, element) {
			WaterfallTable.toggleColumn(value);
			WaterfallTable.redraw(true);
		}
	});

	// Type Filter Init
	for (let key in TYPE_NAME) {
		let html = `<div class="item" data-value="${key}">${TYPE_NAME[key]}</div>`;
		$(html).insertAfter($(".header.item-type"));
	}
	for (let key in NETWORK_TYPE_NAME) {
		let html = `<div class="item" data-value="${key}">${NETWORK_TYPE_NAME[key]}</div>`;
		$(html).insertBefore($(".divider.line-item-type"));
	}

	// Type Filter Action
	$("#type-filter, #type-filter-lineitem").dropdown({
		onChange: function(value, text, selectedItem) {	
			let table;

			let id = $(selectedItem).parents(".dropdown").attr("id");
			switch (id) {
				case "type-filter":
					table = WaterfallTable;
				break;
				case "type-filter-lineitem":
					table = LineItemTable;
					break;
				default:
					return; // do nothing
					break;
			}

			if (value in TYPE_NAME) {
				filterType = "item-type";
			} else if (value in NETWORK_TYPE_NAME) {
				filterType = "network-type";
			} else if (value == "clear-filter") {
				filterType = value;
			} else {
				// do nothing
				return false;
			}

			table.blockRedraw();
			let filters = table.getFilters();

			// Remove existing filters
			for (let i=0; i < filters.length; i++) {
				if (filters[i].field == "type" || filters[i].field == "networkType") {
					_.pullAt(filters, i);
				}
			}
			if (filterType == "item-type") {
				filters.push({field: "type", type: "=", value: value});
				table.setFilter(filters);
			} else if (filterType == "network-type") {
				filters.push({field: "networkType", type: "=", value: value});
				table.setFilter(filters);
			} else if (filterType == "clear-filter") {
				table.setFilter(filters);
				$(`#${id}`).dropdown('restore defaults');
			} else {
				// do nothing
			}
			table.restoreRedraw();
		}
	});

	// Init entire screen loader
	$(".all-content-wrapper").dimmer({duration: 200});

	// Init Checkboxes
	$('.ui.checkbox').checkbox();

	// Init Edit Form
	editFormManager.initForm();
	
	// Copy(Duplicate) Mode (In Copy waterfall form)
	$("#copy-mode").dropdown({ 
		showOnFocus: false,
		onChange: function(value, text, selectedItem) {
			if (value == "in_one_existing_order") {
				$("#copy-form-order-list-field").show();
			} else {
				$("#copy-form-order-list-field").hide();
			}
    }
	});

	// Add line item direct button
	$("#add-direct").dropdown({
		onChange: function (value, text, choice) {
			let orderKey = $(".add-item-order-list.dropdown").dropdown('get value');
			if (_.isEmpty(orderKey.trim())) {
				notifier.show({
					header: "Order Required",
					type: "negative",
					message: "New line item requires order. Please select order."
				});
				return false;
			}
			let orderName = $(".add-item-order-list.dropdown").dropdown('get text');
			// Clear notifiation
			notifier.clear();
			addNewLineItem.add(value, {orderName: orderName, orderKey: orderKey});
		}
	});

	// Disable all buttons
	if (AdUnitId == undefined) {
		$(".button, .search-table-wrapper").addClass('disabled');
		console.log("Disabling all buttons");
	}

	// Status Filter Init
	$('#status-filter, #status-filter-lineitem, #status-filter-order').dropdown({
		onChange: function(value, text, element) {
			let table;

			let id = $(element).parents(".dropdown").attr("id");
			switch (id) {
				case "status-filter":
					table = WaterfallTable;
				break;
				case "status-filter-lineitem":
					table = LineItemTable;
					break;
				case "status-filter-order":
					table = OrderTable;
					break;
				default:
					return; // do nothing
					break;
			}

			table.blockRedraw();
			let filters = table.getFilters();

			// Remove existing status filter
			for (let i=0; i < filters.length; i++) {
				if (filters[i].field == "status") {
					_.pullAt(filters, i);
				}
			}

			// New status
			let statusFilter = {};
			switch (value) {
				case "running":
					statusFilter = {field: "status", type: "=", value: "running"};
					break;
				case "paused":
					statusFilter = {field: "status", type: "=", value: "paused"};
					break;
				case "archived":
					statusFilter = {field: "status", type: "=", value: "archived"};
					break;
				default: // all
					statusFilter = {};
					break;
			}

			if (!_.isEmpty(statusFilter)) {
				filters.push(statusFilter);
				table.setFilter(filters);
			} else {
				if (filters.length == 0) {
					table.clearFilter(true);
				} else {
					table.setFilter(filters); // update with status filter removed.
				}
			}

			table.restoreRedraw();
		}
	});

	// $("#status-filter-order").dropdown('set selected', "running");
	
});


