// static/js/analysis.js
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return location.href = "/login/";

    const authJson = async url => {
        const r = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!r.ok) throw new Error(r.status);
        return r.json();
    };

    // 1) 先抓第一個台幣帳戶
    const accts = await authJson("/api/v1/accounts/?category=ntd");
    if (!accts.length) {
        alert("找不到台幣帳戶");
        return;
    }
    const acct = accts[0];

    // 2) 再呼叫 summary
    const sum = await authJson(`/api/v1/accounts/${acct.id}/summary/`);
    console.log(sum);
    const { cat, month } = sum;

    // 3) 繪製「消費類別占比」(Doughnut)
    new Chart(document.getElementById("chartDoughnut").getContext("2d"), {
        type: "doughnut",
        data: {
            labels: cat.labels,
            datasets: [{
                data: cat.data,
                // backgroundColor: cat.labels.map(() =>
                //   `hsl(${Math.random()*360},70%,60%)`
                // )
                backgroundColor: [
                    "#3b82f6", 
                    "#f87171", 
                    "#34d399",
                ],
                borderColor: "#fff",  // 邊框色，如果不需要可以省略
                borderWidth: 2
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });

    // 4) 繪製「每月總支出走勢」(Bar)
    new Chart(document.getElementById("chartBar").getContext("2d"), {
        type: "bar",
        data: {
            labels: month.labels,
            datasets: [{
                label: "每月支出 (NT$)",
                data: month.data,
                backgroundColor: "#3b82f6"
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
});
