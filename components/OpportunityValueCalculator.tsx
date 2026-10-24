"use client";

import { useMemo, useState } from "react";

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

export default function OpportunityValueCalculator() {
  const [visits, setVisits] = useState(100);
  const [enquiryRate, setEnquiryRate] = useState(3);
  const [closeRate, setCloseRate] = useState(25);
  const [customerValue, setCustomerValue] = useState(500);
  const scenario = useMemo(() => {
    const enquiries = visits * enquiryRate / 100;
    const customers = enquiries * closeRate / 100;
    return { enquiries, customers, value: customers * customerValue };
  }, [visits, enquiryRate, closeRate, customerValue]);

  return (
    <section className="opportunityValue" aria-labelledby="opportunity-value-title">
      <div className="opportunityValueIntro">
        <span>SCENARIO PLANNER</span>
        <h2 id="opportunity-value-title">What could extra qualified visits be worth?</h2>
        <p>Adjust the assumptions to explore a scenario. This is not a forecast and does not use your measured traffic or promise revenue.</p>
      </div>
      <div className="opportunityValueGrid">
        <label>Additional monthly visits<input type="number" min="0" max="1000000" value={visits} onChange={(event) => setVisits(Math.max(0, Number(event.target.value) || 0))} /></label>
        <label>Visit to enquiry rate (%)<input type="number" min="0" max="100" step="0.1" value={enquiryRate} onChange={(event) => setEnquiryRate(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></label>
        <label>Enquiry to sale rate (%)<input type="number" min="0" max="100" step="0.1" value={closeRate} onChange={(event) => setCloseRate(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></label>
        <label>Average customer value (£)<input type="number" min="0" max="10000000" value={customerValue} onChange={(event) => setCustomerValue(Math.max(0, Number(event.target.value) || 0))} /></label>
      </div>
      <div className="opportunityScenarioResult" aria-live="polite">
        <div><span>Scenario enquiries / month</span><strong>{scenario.enquiries.toFixed(1)}</strong></div>
        <div><span>Scenario new customers / month</span><strong>{scenario.customers.toFixed(1)}</strong></div>
        <div><span>Scenario value / month</span><strong>{currency(scenario.value)}</strong></div>
      </div>
    </section>
  );
}
