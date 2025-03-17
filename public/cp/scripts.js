// Debounce function to prevent excessive API calls
function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// Function to fetch search results from API
async function fetchSearchResults() {
    const query = document.getElementById("srchbx").value.trim();
    if (!query) {
        document.getElementById("resultsList").innerHTML = "";
        return;
    }

    try {
        console.log("Fetching from API: /search?q=" + query);
        const response = await fetch(`/api/search?q=${query}`);
        const data = await response.json();

        console.log("API Response:", data); // Logs fetched data

        // Display results in the UI
        // const resultsList = document.getElementById("resultsList");
        // resultsList.innerHTML = data.map(item => `<li>${item.p_name}</li>`).join("");

    } catch (error) {
        console.error("Search Error:", error);
    }
}

// Attach debounce to input field
const searchInput = document.getElementById("srchbx");
searchInput.addEventListener("input", debounce(fetchSearchResults, 500)); // 300ms delay
