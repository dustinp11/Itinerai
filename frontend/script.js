const API_URL = "http://localhost:5000";

document.getElementById("search-btn").addEventListener("click", async () => {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "Loading...";

    const activities = document.getElementById("activities").value;
    const location = document.getElementById("location").value;
    const budget = document.getElementById("budget").value;

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
            Rating: ${p.rating || "N/A"} (${p.user_ratings_total || 0} reviews)<br>
            Price Level: ${p.price_level != null ? "$".repeat(p.price_level) : "N/A"}<br>
            Open Now: ${p.open_now === true ? "Yes" : p.open_now === false ? "No" : "Unknown"}
        </div>
    `).join("");
});
