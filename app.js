const CONFIG = {
  tradeUrl: "./data/trade-data.json",
  reexportsUrl: "./data/reexports-data.json",
  topoUrl: "./data/countries-110m.json",
  width: 760,
  height: 420
};

const dom = {
  statReporter: document.getElementById("stat-reporter"),
  statYear: document.getElementById("stat-year"),
  statImportLeader: document.getElementById("stat-import-leader"),
  statExportLeader: document.getElementById("stat-export-leader"),
  urlPattern: document.getElementById("url-pattern"),
  importSelect: document.getElementById("import-product-select"),
  exportSelect: document.getElementById("export-product-select"),
  importSourceLink: document.getElementById("import-source-link"),
  exportSourceLink: document.getElementById("export-source-link"),
  importLegendMax: document.getElementById("import-legend-max"),
  exportLegendMax: document.getElementById("export-legend-max"),
  importTopCountry: document.getElementById("import-top-country"),
  importTopValue: document.getElementById("import-top-value"),
  importTopQty: document.getElementById("import-top-qty"),
  exportTopCountry: document.getElementById("export-top-country"),
  exportTopValue: document.getElementById("export-top-value"),
  exportTopQty: document.getElementById("export-top-qty"),
  relayTitle: document.getElementById("relay-title"),
  relaySelect: document.getElementById("relay-country-select"),
  relaySourceLink: document.getElementById("relay-source-link"),
  relayLegendMax: document.getElementById("relay-legend-max"),
  relayCountry: document.getElementById("relay-country"),
  relayTopCountry: document.getElementById("relay-top-country"),
  relayTopValue: document.getElementById("relay-top-value"),
  mappingBody: document.getElementById("mapping-body"),
  rankingBody: document.getElementById("ranking-body"),
  detailTitle: document.getElementById("detail-title"),
  detailBody: document.getElementById("detail-body")
};

const state = {
  trade: null,
  reexports: null,
  topo: null,
  selection: {
    imports: "",
    exports: "aggregate-2023"
  },
  activeSide: "imports",
  activeCountryName: "",
  relayTargetCountryName: "United Arab Emirates"
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[(),./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aliasMap = {
  "russian federation": "russia",
  "egypt arab rep": "egypt",
  "iran islamic rep": "iran",
  "korea rep": "south korea",
  "cote d'ivoire": "ivory coast",
  "cote d ivoire": "ivory coast",
  "ethiopia excludes eritrea": "ethiopia",
  "other asia nes": "",
  "serbia fr serbia montenegro": "serbia",
  "syrian arab republic": "syria",
  "venezuela": "venezuela",
  "viet nam": "vietnam",
  "united states of america": "united states",
  "united republic of tanzania": "tanzania",
  "lao pdr": "laos",
  "slovak republic": "slovakia",
  "dominican rep": "dominican republic",
  "macedonia": "north macedonia",
  "north macedonia": "north macedonia",
  "czechia": "czech republic"
};

function canonicalCountryName(name) {
  const normalized = normalize(name);
  if (Object.prototype.hasOwnProperty.call(aliasMap, normalized)) {
    return aliasMap[normalized];
  }
  return normalized;
}

function formatUsdK(value) {
  return "$" + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + "k";
}

function formatKg(value) {
  return Number(value || 0).toLocaleString() + " kg";
}

function formatPartnerLabel(entry) {
  return entry.name + " | " + formatUsdK(entry.valueUsdK) + " | " + formatKg(entry.quantityKg);
}

function cloneDataset(dataset) {
  return {
    key: dataset.key,
    year: dataset.year,
    hs6: dataset.hs6,
    description: dataset.description,
    sourceUrl: dataset.sourceUrl,
    totalValueUsdK: dataset.totalValueUsdK,
    totalQuantityKg: dataset.totalQuantityKg,
    countries: dataset.countries.map((item) => ({
      name: item.name,
      valueUsdK: item.valueUsdK,
      quantityKg: item.quantityKg
    }))
  };
}

function cloneReexportDataset(dataset, reporter) {
  const cloned = cloneDataset(dataset);
  cloned.reporterCode = reporter.reporterCode;
  cloned.reporterName = reporter.reporterName;
  return cloned;
}

function aggregateExportDataset(year) {
  const exportDatasets = state.trade.flows.exports.filter((item) => item.year === year);
  const byCountry = new Map();

  exportDatasets.forEach((dataset) => {
    dataset.countries.forEach((entry) => {
      const key = canonicalCountryName(entry.name);
      if (!key) return;
      const current = byCountry.get(key) || {
        name: entry.name,
        valueUsdK: 0,
        quantityKg: 0
      };
      current.valueUsdK += Number(entry.valueUsdK || 0);
      current.quantityKg += Number(entry.quantityKg || 0);
      byCountry.set(key, current);
    });
  });

  const countries = Array.from(byCountry.values()).sort((a, b) => b.valueUsdK - a.valueUsdK);

  return {
    key: "aggregate-" + year,
    year: year,
    hs6: exportDatasets.map((item) => item.hs6).join(", "),
    description: "All public asbestos-related export products",
    sourceUrl: exportDatasets.map((item) => item.sourceUrl).join("\n"),
    totalValueUsdK: countries.reduce((sum, entry) => sum + entry.valueUsdK, 0),
    totalQuantityKg: countries.reduce((sum, entry) => sum + entry.quantityKg, 0),
    countries: countries
  };
}

function buildSelections() {
  const imports = state.trade.flows.imports.map((dataset) => ({
    value: dataset.hs6 + "-" + dataset.year,
    label: dataset.description + " | HS " + dataset.hs6 + " | " + dataset.year,
    dataset: cloneDataset(Object.assign({ key: dataset.hs6 + "-" + dataset.year }, dataset))
  }));

  const exports = [
    {
      value: "aggregate-2023",
      label: "Aggregated asbestos-related exports | 2023",
      dataset: aggregateExportDataset(2023)
    }
  ].concat(
    state.trade.flows.exports.map((dataset) => ({
      value: dataset.hs6 + "-" + dataset.year,
      label: dataset.description + " | HS " + dataset.hs6 + " | " + dataset.year,
      dataset: cloneDataset(Object.assign({ key: dataset.hs6 + "-" + dataset.year }, dataset))
    }))
  );

  return { imports, exports };
}

function buildRelayOptions() {
  return state.reexports.reporters.map((reporter) => ({
    value: reporter.reporterCode,
    label: reporter.reporterName
  }));
}

function aggregateRelayDataset(reporter, year) {
  const datasets = reporter.datasets.filter((item) => item.year === year);
  const byCountry = new Map();

  datasets.forEach((dataset) => {
    dataset.countries.forEach((entry) => {
      const key = canonicalCountryName(entry.name);
      if (!key) return;
      const current = byCountry.get(key) || {
        name: entry.name,
        valueUsdK: 0,
        quantityKg: 0
      };
      current.valueUsdK += Number(entry.valueUsdK || 0);
      current.quantityKg += Number(entry.quantityKg || 0);
      byCountry.set(key, current);
    });
  });

  const countries = Array.from(byCountry.values()).sort((a, b) => b.valueUsdK - a.valueUsdK);

  return {
    key: reporter.reporterCode + "-aggregate-" + year,
    reporterCode: reporter.reporterCode,
    reporterName: reporter.reporterName,
    year: year,
    hs6: datasets.map((item) => item.hs6).join(", "),
    description: "Aggregated onward exports for loaded asbestos-linked products",
    sourceUrl: datasets.map((item) => item.sourceUrl).join("\n"),
    totalValueUsdK: countries.reduce((sum, entry) => sum + entry.valueUsdK, 0),
    totalQuantityKg: countries.reduce((sum, entry) => sum + entry.quantityKg, 0),
    countries: countries
  };
}

function findRelayReporterByName(name) {
  return state.reexports.reporters.find((reporter) => {
    return canonicalCountryName(reporter.reporterName) === canonicalCountryName(name);
  }) || null;
}

function currentRelayDataset(exportDataset) {
  const requestedReporter = findRelayReporterByName(state.relayTargetCountryName);
  if (!requestedReporter) return null;

  if (exportDataset.key.indexOf("aggregate-") === 0) {
    return aggregateRelayDataset(requestedReporter, exportDataset.year);
  }

  const exact = requestedReporter.datasets.find((dataset) => {
    return dataset.year === exportDataset.year && dataset.hs6 === exportDataset.hs6;
  });

  return exact ? cloneReexportDataset(Object.assign({ key: requestedReporter.reporterCode + "-" + exact.hs6 + "-" + exact.year }, exact), requestedReporter) : null;
}

function fillSelect(selectEl, options, selectedValue) {
  selectEl.innerHTML = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    if (option.value === selectedValue) el.selected = true;
    selectEl.appendChild(el);
  });
}

function renderMappings() {
  dom.mappingBody.innerHTML = "";
  state.trade.codeMappings.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + row.userCode + "</td>" +
      "<td>" + row.description + "</td>" +
      "<td>" + row.mappedHs6 + " | " + row.mappedHs6Description + "</td>" +
      "<td>" + row.coverage + "</td>";
    dom.mappingBody.appendChild(tr);
  });
}

function populateStats(importDataset, exportDataset) {
  const topImport = importDataset.countries.slice().sort((a, b) => b.valueUsdK - a.valueUsdK)[0];
  const topExport = exportDataset.countries.slice().sort((a, b) => b.valueUsdK - a.valueUsdK)[0];

  dom.statReporter.textContent = state.trade.meta.reporter;
  dom.statYear.textContent = String(state.trade.meta.defaultYear);
  dom.statImportLeader.textContent = topImport ? topImport.name : "-";
  dom.statExportLeader.textContent = topExport ? topExport.name : "-";
  dom.urlPattern.textContent = state.trade.meta.witsTradeUrlPattern;
}

function setSummary(side, dataset) {
  const ranked = dataset.countries.slice().sort((a, b) => b.valueUsdK - a.valueUsdK);
  const top = ranked[0];
  const maxLabel = top ? formatUsdK(top.valueUsdK) : "-";

  if (side === "imports") {
    dom.importSourceLink.href = dataset.sourceUrl.split("\n")[0];
    dom.importLegendMax.textContent = maxLabel;
    dom.importTopCountry.textContent = top ? top.name : "-";
    dom.importTopValue.textContent = top ? formatUsdK(top.valueUsdK) : "-";
    dom.importTopQty.textContent = top ? formatKg(top.quantityKg) : "-";
  } else {
    dom.exportSourceLink.href = dataset.sourceUrl.split("\n")[0];
    dom.exportLegendMax.textContent = maxLabel;
    dom.exportTopCountry.textContent = top ? top.name : "-";
    dom.exportTopValue.textContent = top ? formatUsdK(top.valueUsdK) : "-";
    dom.exportTopQty.textContent = top ? formatKg(top.quantityKg) : "-";
  }
}

function setRelaySummary(dataset) {
  if (!dataset) {
    dom.relayTitle.textContent = "No relay dataset loaded";
    dom.relaySourceLink.href = "#";
    dom.relayLegendMax.textContent = "-";
    dom.relayCountry.textContent = state.relayTargetCountryName || "-";
    dom.relayTopCountry.textContent = "-";
    dom.relayTopValue.textContent = "-";
    return;
  }

  const ranked = dataset.countries.slice().sort((a, b) => b.valueUsdK - a.valueUsdK);
  const top = ranked[0];
  dom.relayTitle.textContent = dataset.reporterName + " onward exports";
  dom.relaySourceLink.href = dataset.sourceUrl.split("\n")[0];
  dom.relayLegendMax.textContent = top ? formatUsdK(top.valueUsdK) : "-";
  dom.relayCountry.textContent = dataset.reporterName;
  dom.relayTopCountry.textContent = top ? top.name : "-";
  dom.relayTopValue.textContent = top ? formatUsdK(top.valueUsdK) : "-";
}

function renderRanking(side, dataset, countryName) {
  const ranked = dataset.countries.slice().sort((a, b) => b.valueUsdK - a.valueUsdK);
  dom.rankingBody.innerHTML = "";
  ranked.forEach((entry) => {
    const tr = document.createElement("tr");
    if (countryName && canonicalCountryName(entry.name) === canonicalCountryName(countryName)) {
      tr.style.background = "rgba(255, 230, 194, 0.55)";
    }
    tr.innerHTML =
      "<td>" + entry.name + "</td>" +
      "<td>" + formatUsdK(entry.valueUsdK) + "</td>" +
      "<td>" + formatKg(entry.quantityKg) + "</td>";
    dom.rankingBody.appendChild(tr);
  });

  if (!countryName) {
    dom.detailTitle.textContent = (side === "imports" ? "Import" : "Export") + " leaderboard";
    dom.detailBody.textContent =
      "Current dataset: " + dataset.description + ". Top-ranked partners are ordered by trade value in USD thousand.";
    return;
  }

  const match = ranked.find((entry) => canonicalCountryName(entry.name) === canonicalCountryName(countryName));
  if (!match) {
    dom.detailTitle.textContent = countryName;
    dom.detailBody.textContent = "This country is not part of the current visible partner set for the selected dataset.";
    return;
  }

  dom.detailTitle.textContent = match.name;
  dom.detailBody.textContent =
    (side === "imports" ? "Import source" : "Export market") +
    " for " + dataset.description +
    ". Trade value: " + formatUsdK(match.valueUsdK) +
    ". Quantity: " + formatKg(match.quantityKg) +
    ". HS coverage: " + dataset.hs6 + ".";
}

function createZoom(svgSelector, rootGroup) {
  const svg = d3.select(svgSelector);
  const zoomBehavior = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", function (event) {
      rootGroup.attr("transform", event.transform);
    });

  svg.call(zoomBehavior);

  svg.on("mousedown.drag-ui", function () {
    svg.classed("dragging", true);
  });

  svg.on("mouseup.drag-ui mouseleave.drag-ui", function () {
    svg.classed("dragging", false);
  });

  return {
    zoomIn() {
      svg.transition().duration(180).call(zoomBehavior.scaleBy, 1.3);
    },
    zoomOut() {
      svg.transition().duration(180).call(zoomBehavior.scaleBy, 1 / 1.3);
    },
    reset() {
      svg.transition().duration(180).call(zoomBehavior.transform, d3.zoomIdentity);
    }
  };
}

function renderMap(side, dataset, svgId) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);
  const countries = topojson.feature(state.topo, state.topo.objects.countries).features;
  projection.fitExtent([[14, 18], [CONFIG.width - 14, CONFIG.height - 18]], {
    type: "FeatureCollection",
    features: countries
  });

  const valueMap = new Map();
  dataset.countries.forEach((entry) => {
    const key = canonicalCountryName(entry.name);
    if (!key) return;
    valueMap.set(key, entry);
  });

  const max = d3.max(dataset.countries, (item) => item.valueUsdK) || 1;
  const color = side === "imports"
    ? d3.scaleSequential().domain([0, max]).interpolator(d3.interpolateYlOrBr)
    : d3.scaleSequential().domain([0, max]).interpolator(d3.interpolatePuBuGn);

  const root = svg.append("g");
  const tooltip = root.append("g");

  tooltip.append("rect")
    .attr("class", "map-badge")
    .attr("x", 12)
    .attr("y", 12)
    .attr("width", 420)
    .attr("height", 32)
    .attr("rx", 16);

  const tooltipText = tooltip.append("text")
    .attr("class", "map-label")
    .attr("x", 28)
    .attr("y", 33)
    .text("Hover or click a country");

  root.append("g")
    .selectAll("path")
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", function (feature) {
      const key = canonicalCountryName(feature.properties && feature.properties.name);
      const entry = valueMap.get(key);
      return entry ? color(entry.valueUsdK) : "#efe5d8";
    })
    .classed("active", function (feature) {
      return canonicalCountryName(feature.properties && feature.properties.name) === canonicalCountryName(state.activeCountryName);
    })
    .on("mouseenter", function (_, feature) {
      const rawName = feature.properties && feature.properties.name ? feature.properties.name : "Unknown";
      const entry = valueMap.get(canonicalCountryName(rawName));
      tooltipText.text(entry ? formatPartnerLabel(entry) : rawName + " | no current value");
      d3.select(this).classed("active", true);
    })
    .on("mouseleave", function (_, feature) {
      const rawName = feature.properties && feature.properties.name ? feature.properties.name : "";
      if (canonicalCountryName(rawName) !== canonicalCountryName(state.activeCountryName)) {
        d3.select(this).classed("active", false);
      }
      tooltipText.text("Hover or click a country");
    })
    .on("click", function (_, feature) {
      const rawName = feature.properties && feature.properties.name ? feature.properties.name : "";
      state.activeSide = side;
      state.activeCountryName = rawName;
      if (side === "exports") {
        state.relayTargetCountryName = rawName;
      }
      renderDashboard();
    });

  const zoom = createZoom(svgId, root);
  document.getElementById(side === "imports" ? "import-zoom-in" : "export-zoom-in").onclick = zoom.zoomIn;
  document.getElementById(side === "imports" ? "import-zoom-out" : "export-zoom-out").onclick = zoom.zoomOut;
  document.getElementById(side === "imports" ? "import-zoom-reset" : "export-zoom-reset").onclick = zoom.reset;
}

function renderRelayMap(dataset) {
  if (!dataset) {
    renderMap("relay", {
      countries: [],
      description: "No relay dataset available"
    }, "#relay-map");
    return;
  }

  renderMap("relay", dataset, "#relay-map");
}

function currentDataset(side) {
  const selections = buildSelections();
  const current = selections[side].find((item) => item.value === state.selection[side]);
  return current ? current.dataset : selections[side][0].dataset;
}

function renderDashboard() {
  const importDataset = currentDataset("imports");
  const exportDataset = currentDataset("exports");
  const relayDataset = currentRelayDataset(exportDataset);

  populateStats(importDataset, exportDataset);
  setSummary("imports", importDataset);
  setSummary("exports", exportDataset);
  setRelaySummary(relayDataset);
  renderMap("imports", importDataset, "#import-map");
  renderMap("exports", exportDataset, "#export-map");
  renderRelayMap(relayDataset);
  renderRanking(state.activeSide, state.activeSide === "imports" ? importDataset : exportDataset, state.activeCountryName);

  if (!relayDataset) {
    dom.detailTitle.textContent = state.relayTargetCountryName || "Relay partner";
    dom.detailBody.textContent =
      "No onward-export dataset is loaded yet for this clicked export partner. The current relay layer is seeded for the United Arab Emirates so we can investigate whether a hub market is redistributing the same HS product to other destinations.";
  }
}

function bindEvents() {
  dom.importSelect.addEventListener("change", function (event) {
    state.selection.imports = event.target.value;
    state.activeSide = "imports";
    state.activeCountryName = "";
    renderDashboard();
  });

  dom.exportSelect.addEventListener("change", function (event) {
    state.selection.exports = event.target.value;
    state.activeSide = "exports";
    state.activeCountryName = "";
    renderDashboard();
  });

  dom.relaySelect.addEventListener("change", function (event) {
    const reporter = state.reexports.reporters.find((item) => item.reporterCode === event.target.value);
    state.relayTargetCountryName = reporter ? reporter.reporterName : "";
    renderDashboard();
  });
}

async function init() {
  const [trade, reexports, topo] = await Promise.all([
    d3.json(CONFIG.tradeUrl),
    d3.json(CONFIG.reexportsUrl),
    d3.json(CONFIG.topoUrl)
  ]);

  state.trade = trade;
  state.reexports = reexports;
  state.topo = topo;
  state.selection.imports = trade.flows.imports[0].hs6 + "-" + trade.flows.imports[0].year;

  const selections = buildSelections();
  const relayOptions = buildRelayOptions();
  fillSelect(dom.importSelect, selections.imports, state.selection.imports);
  fillSelect(dom.exportSelect, selections.exports, state.selection.exports);
  fillSelect(dom.relaySelect, relayOptions, relayOptions[0] ? relayOptions[0].value : "");
  renderMappings();
  bindEvents();
  renderDashboard();
}

init().catch(function (error) {
  dom.detailTitle.textContent = "Dashboard failed to load";
  dom.detailBody.textContent = error && error.message ? error.message : "Unknown loading error.";
});
