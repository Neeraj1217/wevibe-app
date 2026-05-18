import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import RootApp from "./RootApp"; // use RootApp instead of App
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);

// Optional: performance logging
reportWebVitals();
