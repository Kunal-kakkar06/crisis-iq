import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [fairnessEnabled, setFairnessEnabled] = useState(false);
  const [crisisActive, setCrisisActive] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <AppContext.Provider value={{ 
      fairnessEnabled, setFairnessEnabled, 
      crisisActive, setCrisisActive,
      mapLoaded, setMapLoaded
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
