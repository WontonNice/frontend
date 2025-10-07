// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";       // match your default export
import "./index.css";          // keep only this CSS import

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
