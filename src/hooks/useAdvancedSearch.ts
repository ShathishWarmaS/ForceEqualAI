'use client';

import { useState, useEffect, useCallback } from 'react';

interface SearchResult {
  documentId: string;
  documentName: string;
  chunk: {
    id: string;
    content: string;
    chunkIndex: number;
  };
  similarity: number;
  preview: string;
}

interface SearchHistory {
  query: string;
  timestamp: Date;
  resultCount: number;
}

interface SearchAnalytics {
  totalSearches: number;
  averageResultCount: number;
  mostSearchedQueries: string[];
  searchFrequency: { [key: string]: number };
}

export function useAdvancedSearch() {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics>({
    totalSearches: 0,
    averageResultCount: 0,
    mostSearchedQueries: [],
    searchFrequency: {}
  });

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(history);
        updateAnalytics(history);
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((history: SearchHistory[]) => {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }, []);

  // Add new search to history
  const addSearchToHistory = useCallback((query: string, resultCount: number) => {
    const newSearch: SearchHistory = {
      query: query.trim(),
      timestamp: new Date(),
      resultCount
    };

    setSearchHistory(prev => {
      // Remove duplicate queries
      const filtered = prev.filter(item => item.query.toLowerCase() !== query.toLowerCase());
      // Keep only last 100 searches
      const updated = [newSearch, ...filtered].slice(0, 100);
      saveSearchHistory(updated);
      updateAnalytics(updated);
      return updated;
    });
  }, [saveSearchHistory]);

  // Update analytics based on search history
  const updateAnalytics = useCallback((history: SearchHistory[]) => {
    if (history.length === 0) return;

    const frequency: { [key: string]: number } = {};
    let totalResults = 0;

    history.forEach(search => {
      const query = search.query.toLowerCase();
      frequency[query] = (frequency[query] || 0) + 1;
      totalResults += search.resultCount;
    });

    const sortedQueries = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);

    setAnalytics({
      totalSearches: history.length,
      averageResultCount: totalResults / history.length,
      mostSearchedQueries: sortedQueries,
      searchFrequency: frequency
    });
  }, []);

  // Generate search suggestions based on history and query
  const generateSuggestions = useCallback((currentQuery: string) => {
    if (currentQuery.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const query = currentQuery.toLowerCase();
    const suggestions = new Set<string>();

    // Add suggestions from search history
    searchHistory.forEach(item => {
      if (item.query.toLowerCase().includes(query) && item.query.toLowerCase() !== query) {
        suggestions.add(item.query);
      }
    });

    // Add common search patterns and expansions
    const commonPrefixes = ['what is', 'how to', 'explain', 'define', 'summarize'];
    const commonSuffixes = ['definition', 'explanation', 'examples', 'benefits', 'process'];
    
    commonPrefixes.forEach(prefix => {
      if (query.length > 3 && !query.startsWith(prefix)) {
        suggestions.add(`${prefix} ${query}`);
      }
    });

    commonSuffixes.forEach(suffix => {
      if (query.length > 3 && !query.endsWith(suffix)) {
        suggestions.add(`${query} ${suffix}`);
      }
    });

    // Limit to 8 suggestions and sort by relevance
    const finalSuggestions = Array.from(suggestions)
      .slice(0, 8)
      .sort((a, b) => {
        const aFreq = analytics.searchFrequency[a.toLowerCase()] || 0;
        const bFreq = analytics.searchFrequency[b.toLowerCase()] || 0;
        return bFreq - aFreq;
      });

    setSearchSuggestions(finalSuggestions);
  }, [searchHistory, analytics.searchFrequency]);

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    setAnalytics({
      totalSearches: 0,
      averageResultCount: 0,
      mostSearchedQueries: [],
      searchFrequency: {}
    });
  }, []);

  // Get recent searches
  const getRecentSearches = useCallback((limit: number = 5) => {
    return searchHistory.slice(0, limit);
  }, [searchHistory]);

  // Get popular searches
  const getPopularSearches = useCallback((limit: number = 5) => {
    return analytics.mostSearchedQueries.slice(0, limit);
  }, [analytics.mostSearchedQueries]);

  return {
    searchHistory,
    searchSuggestions,
    analytics,
    addSearchToHistory,
    generateSuggestions,
    clearSearchHistory,
    getRecentSearches,
    getPopularSearches
  };
}