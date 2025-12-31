/**
 * Transaction State Hook
 * Manages local state for transaction selection (category, project)
 */

import { useState } from 'react';

export function useTransactionState() {
  const [selectedCategory, setSelectedCategory] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<Record<number, number | undefined>>({});

  const updateCategory = (txId: number, category: string) => {
    setSelectedCategory(prev => ({ ...prev, [txId]: category }));
  };

  const updateProject = (txId: number, projectId: number | undefined) => {
    setSelectedProject(prev => ({ ...prev, [txId]: projectId }));
  };

  const clearSelection = (txId: number) => {
    setSelectedCategory(prev => {
      const newState = { ...prev };
      delete newState[txId];
      return newState;
    });
    setSelectedProject(prev => {
      const newState = { ...prev };
      delete newState[txId];
      return newState;
    });
  };

  return {
    selectedCategory,
    selectedProject,
    updateCategory,
    updateProject,
    clearSelection,
    setSelectedCategory,
    setSelectedProject,
  };
}
