/**
 * Crypto Idea — React Entry Point
 * Renders the app into the DOM
 */
import React from "react";
import ReactDOM from "react-dom/client";
import CryptoIdea from "./CryptoIdea.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CryptoIdea />
  </React.StrictMode>
);
