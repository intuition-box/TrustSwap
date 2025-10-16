import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { RootProviders } from "./lib/dynamic"
import { LiveRefetchProvider } from "./live/LiveRefetchProvider";
import { AlertsProvider, AlertToaster, AlertModalHost } from "./features/alerts/Alerts";
import styles from "../../web/src/styles/Layout.module.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AlertsProvider>
      <RootProviders>
        <BrowserRouter>
          <LiveRefetchProvider>

              <App />
             
          </LiveRefetchProvider>  
        </BrowserRouter>
      </RootProviders>
      <AlertToaster />
      <AlertModalHost />
    </AlertsProvider>
  </React.StrictMode>
);
