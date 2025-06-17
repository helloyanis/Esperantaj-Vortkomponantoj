document.addEventListener("DOMContentLoaded", () => {
    if(!navigator.onLine) {
        console.warn("Retejo ne disponeblas, ne spuri...");
        document.querySelector("#analytics-description").textContent = "Datumkolektado ne haveblas ĉar vi estas senkonektita";
        return;
    }
    document.querySelector("#menu-analytics").addEventListener("click", () => {
        if(!navigator.onLine) {
            mdui.snackbar({
                message: "Bonvolu unue konektiĝi.",
                closeable: true
            });
            return;
        }
        if(navigator.doNotTrack || navigator.globalPrivacyControl) {
            mdui.snackbar({
                message: "Neeble, viaj retumilaj agordoj ne permesas la kolektadon de datumoj.",
                closeable: true
            });
            return;
        }
        if(localStorage.getItem("doNotTrack") === "true") {
            localStorage.setItem("doNotTrack", "false");
            askAnalytics();
            mdui.snackbar({
                message: "Kolekto de datumoj estas reaktivigita.",
                closeable: true
            });
        }
        else {
            localStorage.setItem("doNotTrack", "true");
            askAnalytics();
            mdui.snackbar({
                message: "Kolekto de datumoj estas malŝaltita. Reŝargu la paĝon por apliki la ŝanĝon.",
                action: "Reŝargi",
                closeable: true,
                onActionClick: () => {
                    location.reload();
                }
                
            });
        }
    askAnalytics();
    })
    askAnalytics();
})

window.addEventListener("online", () => {
    askAnalytics();
});
window.addEventListener("offline", () => {
    document.querySelector("#analytics-description").textContent = "Datumkolektado ne haveblas ĉar vi estas senkonektita";
});

function askAnalytics() {
    if(navigator.doNotTrack || navigator.globalPrivacyControl) {
        document.querySelector("#analytics-description").textContent = "Datumkolektado estis aŭtomate malŝaltita ĉar via retumilo petas retejojn ne spuri vin.";
        return;
    }
    if( localStorage.getItem("doNotTrack") === "true") {
        document.querySelector("#analytics-description").textContent = "Vi malŝaltis datenkolektadon, alklaku ĉi tie por reaktivigi ĝin.";
        return;
    }
    if(!localStorage.getItem("doNotTrack")) {
        mdui.snackbar({
            message: "Anonimaj datumoj estas kolektitaj kun Google Analytics por kontroli la ĝustan funkciadon de la retejo, kaj ne estos dividitaj kun triaj partioj. Vi povas malŝalti la kolekton alklakante la kontraŭan butonon.",
            action: "Malŝalti",
            closeable: true,
            autoCloseDelay: 10000,
            onActionClick: () => {
                localStorage.setItem("doNotTrack", "true");
                mdui.snackbar({
                    message: "Kolekto de datumoj estas malŝaltita.",
                    closeable: true
                });
            },
            onClose: () => {
                if(localStorage.getItem("doNotTrack") !== "true") {
                    localStorage.setItem("doNotTrack", "false");
                }
                    loadAnalytics()
                }
        });
    }else {
        loadAnalytics();
    }
};

function loadAnalytics() {
    if(localStorage.getItem("doNotTrack") === "true"){
        document.querySelector("#analytics-description").textContent = "Vi malŝaltis datenkolektadon, alklaku ĉi tie por reaktivigi ĝin.";
        return;
    }
    document.querySelector("#analytics-description").textContent = "Datumkolektado estas nuntempe ebligita. Alklaku ĉi tie por malŝalti ĝin.";
    const analyticsTag = document.createElement("script");
    analyticsTag.src = "https://www.googletagmanager.com/gtag/js?id=G-J5NN9MEM5P";
    analyticsTag.async = true;
    document.head.appendChild(analyticsTag);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-J5NN9MEM5P');
}