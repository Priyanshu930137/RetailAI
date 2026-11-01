
const API_BASE_URL = "http://127.0.0.1:8000";

async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);

        if (!response.ok) {
            throw new Error("Backend health check failed");
        }

        return await response.json();
    } catch (error) {
        console.error("Backend connection error:", error);
        return null;
    }
}

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);

        if (!response.ok) {
            throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        return data.products || [];
    } catch (error) {
        console.error("Product fetch error:", error);
        return [];
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const health = await checkBackendHealth();
    const products = await fetchProducts();

    console.log("Backend health:", health);
    console.log("Backend products:", products);

    // Make the API data available to other frontend scripts.
    window.retailAI = {
        apiBaseUrl: API_BASE_URL,
        health,
        products
    };

    // Notify the frontend that the API data has loaded.
    document.dispatchEvent(new Event("retailAIDataLoaded"));
});
