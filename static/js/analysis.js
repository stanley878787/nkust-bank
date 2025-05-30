// static/js/analysis.js

document.addEventListener("DOMContentLoaded", async () => {
    // 0) 取得 token，若沒有就跳轉到 /login/
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return location.href = "/login/";
    }

    // 1) authJson：帶 Authorization header 的 fetch helper
    const authJson = async (url) => {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(r.status);
      return r.json();
    };

    // 2) 先讀「台幣帳戶 (category=ntd)」
    let acctId;
    try {
        const accts = await authJson("/api/v1/accounts/?category=ntd");
        if (!accts.length) {
            alert("找不到台幣帳戶");
            return;
        }
        acctId = accts[0].id;
    } catch (err) {
        console.error("抓帳戶列表失敗：", err);
        alert("讀取帳戶失敗");
        return;
    }

    // 3) 取得 <select id="periodSelect">，並記住初始值
    const periodSelect = document.getElementById("periodSelect");
    // 如果找不到 periodSelect，就給一個預設值避免出錯
    let currentPeriod = periodSelect ? periodSelect.value : "3months";

    // 4) Chart 實例變數，供重繪時銷毀
    let categoryChart = null;
    let barChart = null;

    let currentChartType = "line"; // 預設為折線圖

    function drawBarChart(monthLabels, monthData) {
        if (barChart) barChart.destroy();

        const barCtx = document.getElementById("chartBar")?.getContext("2d");
        if (!barCtx || !monthLabels.length || !monthData.length) return;

        const displayLabels = monthLabels.map((l) => {
            const parts = l.split("-");
            return `${parseInt(parts[1], 10)}月`;
        });

        barChart = new Chart(barCtx, {
            type: currentChartType,
            data: {
                labels: displayLabels,
                datasets: [
                    {
                    label: "月支出 (NT$)",
                    data: monthData,
                    backgroundColor: "rgba(59, 130, 246, 0.5)",
                    borderColor: "#3b82f6",
                    borderWidth: 2,
                    tension: 0.3,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#3b82f6",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(0, 0, 0, 0.05)" },
                    },
                    x: {
                        grid: { display: false },
                        offset: true,
                    },
                },
                plugins: {
                    legend: { display: false },
                },
                datasets: {
                    bar: {
                        barPercentage: 0.8,
                        categoryPercentage: 0.6,
                    }
                }
            }
    });

    // 切換為折線圖
    document.getElementById("btnLine")?.addEventListener("click", function () {
    currentChartType = "line";

    this.classList.remove("bg-gray-200", "text-gray-700");
    this.classList.add("bg-blue-600", "text-white");
    document.getElementById("btnBar")?.classList.remove("bg-blue-600", "text-white");
    document.getElementById("btnBar")?.classList.add("bg-gray-200", "text-gray-700");

    if (barChart) {
        barChart.config.type = "line";
        barChart.update();
    }
    });

    // 切換為長條圖
    document.getElementById("btnBar")?.addEventListener("click", function () {
    currentChartType = "bar";

    this.classList.remove("bg-gray-200", "text-gray-700");
    this.classList.add("bg-blue-600", "text-white");
    document.getElementById("btnLine")?.classList.remove("bg-blue-600", "text-white");
    document.getElementById("btnLine")?.classList.add("bg-gray-200", "text-gray-700");

    if (barChart) {
        barChart.config.type = "bar";
        barChart.update();
    }
    });

      // 綁定切換折線／柱狀圖按鈕
      document.getElementById("btnLine")?.addEventListener("click", function () {
        this.classList.remove("bg-gray-200", "text-gray-700");
        this.classList.add("bg-blue-600", "text-white");
        document.getElementById("btnBar")?.classList.remove("bg-blue-600", "text-white");
        document.getElementById("btnBar")?.classList.add("bg-gray-200", "text-gray-700");

        barChart.config.type = "line";
        barChart.update();
      });
      document.getElementById("btnBar")?.addEventListener("click", function () {
        this.classList.remove("bg-gray-200", "text-gray-700");
        this.classList.add("bg-blue-600", "text-white");
        document.getElementById("btnLine")?.classList.remove("bg-blue-600", "text-white");
        document.getElementById("btnLine")?.classList.add("bg-gray-200", "text-gray-700");

        barChart.config.type = "bar";
        barChart.update();
      });
    }

    /**
     * loadCategoryChart：給定 period，呼叫 API 拿回 { cat, month }，並
     *  (A) 重建 Doughnut 圖
     *  (B) 同步更新「消費摘要」內的項目
     *  (C) 呼叫 drawBarChart 以重繪折線／柱狀圖
     */
    async function loadCategoryChart(period) {
      try {
            // 1) 呼叫後端 Summary API，並帶上 ?period=
            const sum = await authJson(`/api/v1/accounts/${acctId}/summary/?period=${period}`);
            const { cat, month } = sum;
            const catLabels = Array.isArray(cat.labels) ? cat.labels : [];
            const catData = Array.isArray(cat.data) ? cat.data : [];
            const monthLabels = Array.isArray(month.labels) ? month.labels : [];
            const monthData = Array.isArray(month.data) ? month.data : [];

            // -------------------------------
            // (A) 重建「消費類別占比」Doughnut
            // -------------------------------
            if (categoryChart) {
                categoryChart.destroy();
            }
            const doughnutCtx =
            document.getElementById("chartDoughnut")?.getContext("2d");
            if (doughnutCtx) {
                categoryChart = new Chart(doughnutCtx, {
                    type: "doughnut",
                    data: {
                        labels: catLabels,
                        datasets: [
                            {
                            data: catData,
                            backgroundColor: [
                                "#3b82f6",
                                "#22c55e",
                                "#eab308",
                                "#ef4444",
                                "#a855f7",
                                "#f87171",
                                "#34d399",
                            ].slice(0, catLabels.length),
                            borderWidth: 0,
                            hoverOffset: 10,
                            },
                        ],
                    },
                        options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "70%",
                        plugins: {
                            legend: {
                                display: true,
                                position: "bottom",
                                labels: {
                                    boxWidth: 14,
                                    boxHeight: 14,
                                    padding: 16,
                                    font: { size: 14, weight: "500" },
                                },
                            },
                        },
                    },
                });
            }

            // -------------------------------
            // (B) 同步更新「消費摘要」區塊
            // -------------------------------

             // 1. 更新「總支出標題」文字
            const periodTotalLabelEl = document.getElementById("periodTotalLabel");
            if (periodTotalLabelEl) {
                if (period === "6months") periodTotalLabelEl.textContent = "近半年總支出";
                else if (period === "1year") periodTotalLabelEl.textContent = "近一年總支出";
                else periodTotalLabelEl.textContent = "近三個月總支出";
            }

            // 2. 計算並顯示「該期間總支出」
            const periodTotalAmountEl = document.getElementById("periodTotalAmount");
            const totalSum = monthData.reduce((acc, v) => acc + v, 0);
            if (periodTotalAmountEl) {
                periodTotalAmountEl.textContent = `NT$ ${Math.round(totalSum).toLocaleString()}`;
            }

            // 3. 計算並顯示「最高消費類別」
            if (catLabels.length && catData.length) {
                let maxIndex = 0;
                for (let i = 1; i < catData.length; i++) {
                if (catData[i] > catData[maxIndex]) {
                    maxIndex = i;
                }
                }
                const highestNameEl = document.getElementById("highestCategoryName");
                const highestAmountEl = document.getElementById("highestCategoryAmount");
                if (highestNameEl) highestNameEl.textContent = catLabels[maxIndex];
                if (highestAmountEl)
                highestAmountEl.textContent = `NT$ ${Math.round(catData[maxIndex]).toLocaleString()}`;
            }

            // 4. 計算並顯示「平均每日消費」和「與上一期比較」
            let periodDays = 90;
            if (period === "6months") periodDays = 180;
            else if (period === "1year") periodDays = 365;

            const avgDailyAmountEl = document.getElementById("avgDailyAmount");
            const avgDailyChangeEl = document.getElementById("avgDailyChange");
            if (avgDailyAmountEl && avgDailyChangeEl) {
                const avgCurr = periodDays > 0 ? totalSum / periodDays : 0;
                avgDailyAmountEl.textContent = `NT$ ${Math.round(avgCurr).toLocaleString()}`;

                // 簡易版「與上一期比較」：以「期初那一個月平均」Vs「期末那一個月平均」
                if (monthData.length >= 2) {
                const firstTotal = monthData[0];
                const lastTotal = monthData[monthData.length - 1];

                const [firstY, firstM] = monthLabels[0].split("-");
                const [lastY, lastM] = monthLabels[monthLabels.length - 1].split("-");
                const daysInFirstMonth = new Date(
                    parseInt(firstY, 10),
                    parseInt(firstM, 10),
                    0
                ).getDate();
                const daysInLastMonth = new Date(
                    parseInt(lastY, 10),
                    parseInt(lastM, 10),
                    0
                ).getDate();

                const avgFirst = daysInFirstMonth > 0 ? firstTotal / daysInFirstMonth : 0;
                const avgLast = daysInLastMonth > 0 ? lastTotal / daysInLastMonth : 0;

                if (avgFirst > 0) {
                    const pctChange = ((avgLast - avgFirst) / avgFirst) * 100;
                    const absPct = Math.abs(pctChange).toFixed(1);
                    if (pctChange >= 0) {
                    avgDailyChangeEl.textContent = `↑ ${absPct}%`;
                    avgDailyChangeEl.classList.remove("text-red-500");
                    avgDailyChangeEl.classList.add("text-green-500");
                    } else {
                    avgDailyChangeEl.textContent = `↓ ${absPct}%`;
                    avgDailyChangeEl.classList.remove("text-green-500");
                    avgDailyChangeEl.classList.add("text-red-500");
                    }
                }
                }
            }

            // 5. 計算並顯示「與上個月相比」百分比
            const monthChangeEl = document.getElementById("monthChange");
            if (monthChangeEl && monthData.length >= 2) {
                const prevTotal = monthData[monthData.length - 2];
                const currTotal = monthData[monthData.length - 1];

                if (prevTotal > 0) {
                const changePct = ((currTotal - prevTotal) / prevTotal) * 100;
                const absPct = Math.abs(changePct).toFixed(1);
                if (changePct >= 0) {
                    monthChangeEl.textContent = `增加 ${absPct}%`;
                    monthChangeEl.classList.remove("text-green-500");
                    monthChangeEl.classList.add("text-red-500");
                } else {
                    monthChangeEl.textContent = `減少 ${absPct}%`;
                    monthChangeEl.classList.remove("text-red-500");
                    monthChangeEl.classList.add("text-green-500");
                }
                } else {
                monthChangeEl.textContent = "—";
                monthChangeEl.classList.remove("text-red-500", "text-green-500");
                }
            } else if (monthChangeEl) {
                monthChangeEl.textContent = "--";
                monthChangeEl.classList.remove("text-red-500", "text-green-500");
            }


            // -------------------------------
            // (C) 呼叫 drawBarChart，以重繪折線／柱狀圖
            // -------------------------------
            drawBarChart(monthLabels, monthData);
        } catch (err) {
            console.error("載入期間資料失敗：", err);
            // 如有需要，再加上錯誤提示
        }
    }

    // 7) 頁面初次載入時，先跑一次 loadCategoryChart(currentPeriod)
    await loadCategoryChart(currentPeriod);

    // 8) 綁定「下拉選單改變」事件，每次改就重新載入
    if (periodSelect) {
        periodSelect.addEventListener("change", async (e) => {
            currentPeriod = e.target.value; // 例: "3months", "6months", "1year"
            await loadCategoryChart(currentPeriod);
        });
    }

    // 匯出PDF
    const downloadBtn = document.getElementById("downloadPdfBtn");

    downloadBtn?.addEventListener("click", function (e) {
        e.preventDefault();

        const report = document.getElementById("reportSection");
        if (!report) return;

        // 強制壓縮畫面（CSS 縮放讓它塞進一頁）
        report.style.transform = 'scale(0.75)';
        report.style.transformOrigin = 'top left';
        report.style.width = 'calc(100% / 0.75)'; // 補償 scale 縮放

        const opt = {
            margin:       0,
            filename:     '消費分析報告.pdf',
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  {
                scale: 4,  // 比原本的 2 高出 2 倍，細節更多
                useCORS: true
            },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
            pagebreak:    { mode: ['avoid-all'] }
        };

        html2pdf().set(opt).from(report).save().then(() => {
            // 還原 CSS
            report.style.transform = '';
            report.style.transformOrigin = '';
            report.style.width = '';
        });
    });
});
