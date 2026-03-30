// This file is deprecated and mock data has been removed.
// It is kept as an empty shell to prevent import errors in case of lingering references,
// though all references should have been removed.

import { createContext, useContext } from 'react';

const MockDataContext = createContext(null);

export function MockDataProvider({ children }) {
  return children;
}

export function useMockData() {
  // Throw error if used, to catch any missed usages
  throw new Error('useMockData is deprecated and should not be used. Please use apiClient.');
}

export function useCollection(resource) {
  throw new Error(`useCollection(${resource}) is deprecated. Use apiClient.`);
}
