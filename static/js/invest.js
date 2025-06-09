let currentTab = "investments";
let currentTradeType = "buy";

function switchTab(tab) {
  const investmentsSection = document.getElementById("investments-section");
  const tradingSection = document.getElementById("trading-section");
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((t) => {
    t.classList.remove("tab-active");
    t.classList.add("tab-inactive");
  });

  if (tab === "investments") {
    investmentsSection.style.display = "block";
    tradingSection.style.display = "none";
    tabs[0].classList.add("tab-active");
    tabs[0].classList.remove("tab-inactive");
  } else {
    investmentsSection.style.display = "none";
    tradingSection.style.display = "block";
    tabs[1].classList.add("tab-active");
    tabs[1].classList.remove("tab-inactive");
  }

  currentTab = tab;
}

// static/js/invest.js
