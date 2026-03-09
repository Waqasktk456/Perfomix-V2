import axios from 'axios';

const API_URL = 'http://localhost:5000/api/performance-ratings';

// Cache for ratings to avoid repeated API calls
let ratingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Get all ratings for organization
export const getPerformanceRatings = async (forceRefresh = false) => {
  try {
    // Return cached data if available and not expired
    if (!forceRefresh && ratingsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return ratingsCache;
    }

    const response = await axios.get(API_URL, getAuthConfig());
    
    if (response.data.success) {
      ratingsCache = response.data.data;
      cacheTimestamp = Date.now();
      return ratingsCache;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching performance ratings:', error);
    return [];
  }
};

// Get rating for a specific score
export const getPerformanceRating = async (score) => {
  try {
    // Try to use cached ratings first
    const ratings = await getPerformanceRatings();
    
    if (ratings && ratings.length > 0) {
      const rating = ratings.find(r => 
        score >= parseFloat(r.min_score) && score <= parseFloat(r.max_score)
      );
      
      if (rating) {
        return {
          level: rating.name,
          color: rating.color,
          bg: rating.bg_color || rating.color,
          id: rating.id
        };
      }
    }
    
    // Fallback to API call
    const response = await axios.get(`${API_URL}/score/${score}`, getAuthConfig());
    
    if (response.data.success) {
      const rating = response.data.data;
      return {
        level: rating.name,
        color: rating.color,
        bg: rating.bg_color || rating.color,
        id: rating.id
      };
    }
    
    // Default fallback
    return { level: 'Not Rated', color: '#9E9E9E', bg: '#F5F5F5', id: null };
  } catch (error) {
    console.error('Error fetching rating for score:', error);
    return { level: 'Not Rated', color: '#9E9E9E', bg: '#F5F5F5', id: null };
  }
};

// Create a new rating
export const createPerformanceRating = async (ratingData) => {
  try {
    const response = await axios.post(API_URL, ratingData, getAuthConfig());
    
    if (response.data.success) {
      // Clear cache
      ratingsCache = null;
      cacheTimestamp = null;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating rating:', error);
    throw error;
  }
};

// Update a rating
export const updatePerformanceRating = async (id, ratingData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, ratingData, getAuthConfig());
    
    if (response.data.success) {
      // Clear cache
      ratingsCache = null;
      cacheTimestamp = null;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error updating rating:', error);
    throw error;
  }
};

// Delete a rating
export const deletePerformanceRating = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthConfig());
    
    if (response.data.success) {
      // Clear cache
      ratingsCache = null;
      cacheTimestamp = null;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error deleting rating:', error);
    throw error;
  }
};

// Validate coverage
export const validateCoverage = async () => {
  try {
    const response = await axios.get(`${API_URL}/validate-coverage`, getAuthConfig());
    return response.data;
  } catch (error) {
    console.error('Error validating coverage:', error);
    throw error;
  }
};

// Clear cache (useful when switching organizations)
export const clearRatingsCache = () => {
  ratingsCache = null;
  cacheTimestamp = null;
};
