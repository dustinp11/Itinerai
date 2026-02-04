const API_URL = "http://localhost:4999";

async function loadPreferences() {
    try {
        const response = await fetch(`${API_URL}/users/preferences`);
        if (!response.ok) return;
        const { preference: prefs } = await response.json();

        if (prefs.activities && prefs.activities.length > 0) {
            document.getElementById("activities").value = prefs.activities.join(", ");
        }
        if (prefs.budget) {
            document.getElementById("budget").value = String(prefs.budget);
        }
    } catch (e) {
        console.warn("Could not load saved preferences:", e);
    }
}

loadPreferences();

document.getElementById("search-btn").addEventListener("click", async () => {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "Loading...";

    const activities = document.getElementById("activities").value;
    const location = document.getElementById("location").value;
    const budget = document.getElementById("budget").value;

    // save preferences (fire and forget)
    fetch(`${API_URL}/users/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clerkUserId: "local-test",
            preferences: {
                activities: activities.split(",").map(a => a.trim()).filter(a => a.length > 0),
                budget: budget,
                travelDistance: null,
                transportModes: []
            }
        })
    });

    const params = new URLSearchParams({
        activities: activities,
        location: location,
        budget: budget
    });

    const response = await fetch(`${API_URL}/search?${params}`);
    const places = await response.json();

    resultsDiv.innerHTML = places.map(p => `
        <div class="place-card">
            <strong>${p.name}</strong><br>
            Rating: ${p.rating || "N/A"} (${p.ratingCount || 0} reviews)<br>
            Price Level: ${p.priceLevel != null ? "$".repeat(p.priceLevel) : "N/A"}<br>
            Open Now: ${p.openNow === true ? "Yes" : p.openNow === false ? "No" : "Unknown"}
        </div>
    `).join("");
});
