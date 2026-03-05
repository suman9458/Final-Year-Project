import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./context/AuthContext"
import { TradingProvider } from "./context/TradingContext"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <TradingProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TradingProvider>
    </AuthProvider>
  </React.StrictMode>
)
