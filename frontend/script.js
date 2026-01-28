const API_URL = "http://localhost:5000";

document.getElementById("search-btn").addEventListener("click", async () => {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "Loading...";

    const response = await fetch(`${API_URL}/api/search?query=places near UC Irvine`);
    const data = await response.json();
    const places = data.results || data;

    resultsDiv.innerHTML = places.map(p => `
        <div class="place-card">
            <strong>${p.name}</strong><br>
            Rating: ${p.rating || "N/A"} (${p.user_ratings_total || 0} reviews)<br>
            Price Level: ${p.price_level != null ? "$".repeat(p.price_level + 1) : "N/A"}<br>
            Open Now: ${p.open_now === true ? "Yes" : p.open_now === false ? "No" : "Unknown"}
        </div>
    `).join("");
});
