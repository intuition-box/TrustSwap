import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { RootProviders } from "./lib/dynamic"




ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RootProviders>
  </React.StrictMode>
);
