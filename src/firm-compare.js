(() => {
  "use strict";
  const data = JSON.parse(document.getElementById("fc-data").textContent);
  const firms = Array.from(document.querySelectorAll("[data-firm]"));
  const plans = Array.from(document.querySelectorAll("[data-plan]"));
  const requested = [...new Set(new URLSearchParams(location.search).getAll("firm"))]
    .map(name => data.findIndex(firm => firm.name === name))
    .filter(index => index >= 0)
    .slice(0, firms.length);
  if (requested.length) {
    firms.forEach((select, index) => { select.value = requested[index]?.toString() ?? ""; });
  }
  const defaults = firms.map(select => select.value);
  const table = document.getElementById("fc-table");
  const results = document.getElementById("fc-results");
  const status = document.getElementById("fc-status");
  const region = window.PFMRegion;
  const missing = "Not verified";

  const rows = [
    ["Regional eligibility", "region"], ["Category", "category"], ["Data status", "status"],
    ["Account / plan", "label"], ["Published regional price / fees", "price"],
    ["Local currency estimate", "localPrice"], ["Profit target", "target"],
    ["Maximum drawdown", "dd"], ["Drawdown type", "dd_type"], ["Daily loss limit", "dll"],
    ["Contract limits", "contracts"], ["Minimum trading days", "days"],
    ["Consistency rule", "consistency"], ["Source date", "checked"],
  ];
  const statusNames = {
    "sourced-preset": "Sourced plan data",
    "partial-source": "Partial source data",
    "research-needed": "Research pending",
  };
  const highlight = new Set(["price", "target", "dd", "dll", "contracts", "days", "consistency", "dd_type"]);

  function selectedFirm(index) {
    const value = firms[index].value;
    return value === "" ? null : data[Number(value)];
  }

  function updatePlans(index) {
    const firm = selectedFirm(index);
    const select = plans[index];
    select.replaceChildren(...(firm ? firm.plans.map((plan, index) => new Option(plan.label, index)) : []));
    select.disabled = !firm;
  }

  function cell(row, tag, value, scope) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (scope) element.scope = scope;
    row.append(element);
    return element;
  }

  function link(parent, href, label) {
    const element = document.createElement("a");
    element.href = href;
    element.textContent = label;
    parent.append(element);
  }

  function valueFor(firm, plan, key, country) {
    switch (key) {
      case "localPrice": return region.localPrice(plan);
      case "price": return region.price(plan);
      case "region": return country ? region.region(firm.name, country).label : "Choose a country to check restrictions";
      case "status": return statusNames[firm.status] ?? missing;
      default: return plan[key] ?? firm[key] ?? missing;
    }
  }

  function render() {
    const picks = firms.flatMap((_, index) => {
      const firm = selectedFirm(index);
      return firm ? [{firm, plan: firm.plans[Number(plans[index].value)]}] : [];
    });
    const country = region.get();
    const head = table.tHead;
    const body = table.tBodies[0];
    head.replaceChildren();
    body.replaceChildren();

    const header = head.insertRow();
    cell(header, "th", "Comparison", "col");
    picks.forEach(({firm, plan}) => cell(header, "th", firm.name + " · " + plan.label, "col"));

    rows.forEach(([label, key]) => {
      const row = body.insertRow();
      cell(row, "th", label, "row");
      const values = picks.map(({firm, plan}) => valueFor(firm, plan, key, country));
      values.forEach(value => cell(row, "td", value));
      if (highlight.has(key) && values.every(value => value !== missing) && new Set(values).size > 1) {
        row.classList.add("compare-difference");
      }
    });

    const payouts = body.insertRow();
    cell(payouts, "th", "Funded payout notes (firm-wide; check plan)", "row");
    const sources = body.insertRow();
    cell(sources, "th", "Firm profile and sources", "row");
    picks.forEach(({firm}) => {
      const payout = cell(payouts, "td", firm.payout.length ? "" : missing);
      if (firm.payout.length) {
        const list = document.createElement("ul");
        firm.payout.forEach(note => {
          const item = document.createElement("li");
          item.textContent = note;
          list.append(item);
        });
        payout.append(list);
      }

      const source = cell(sources, "td", "");
      link(source, firm.profile, "View firm profile");
      if (firm.sources.length) {
        const list = document.createElement("ul");
        firm.sources.forEach(([href, label]) => {
          const item = document.createElement("li");
          link(item, href, label);
          list.append(item);
        });
        source.append(list);
      }
    });

    results.hidden = picks.length === 0;
    status.textContent = picks.length < 2
      ? "Choose at least two plans for a comparison."
      : `${picks.length} plans selected. Compare costs and rules within the same account stage. Published prices may change.`;
  }

  document.getElementById("fc-reset").addEventListener("click", () => {
    firms.forEach((select, index) => {
      select.value = defaults[index];
      updatePlans(index);
    });
    render();
  });

  window.addEventListener("pfm-country-change", render);
  firms.forEach((select, index) => {
    updatePlans(index);
    select.addEventListener("change", () => {
      updatePlans(index);
      render();
    });
    plans[index].addEventListener("change", render);
  });
  render();
})();
