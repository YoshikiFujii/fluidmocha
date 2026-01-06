// Check authentication status
(async function checkAuth() {
    try {
        const res = await fetch('api/me.php');
        if (!res.ok) {
            // Redirect on 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
            console.warn("Auth check failed, redirecting to login. Status:", res.status);
            window.location.href = 'index.html';
        } else {
            // Success: Show the page
            document.body.classList.remove('auth-loading');
        }
    } catch (e) {
        console.error("Auth check failed", e);
        // Optional: Redirect on network error?
    }
})();
