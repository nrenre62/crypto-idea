import { createContext, useContext } from "react";

// Shared app state + handlers for the user app's screens. CryptoIdea.jsx builds
// the value and wraps its render in <AppContext.Provider>; extracted screens read
// what they need via useApp(), avoiding 25+ props per screen.
export const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);
