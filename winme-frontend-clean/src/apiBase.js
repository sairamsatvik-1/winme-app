const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.origin.includes("localhost")
    ? "http://localhost:5000"
    : window.location.origin);

export default API_BASE;