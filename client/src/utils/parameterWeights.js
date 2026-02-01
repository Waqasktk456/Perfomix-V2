// Utility functions for parameter weight scaling

// Add a parameter with scaling
export function addParameterWithScaling(existingParameters, newParamWeight, newParamObj) {
  const oldTotal = existingParameters.reduce((sum, p) => sum + (p.weightage || 0), 0);
  // If total + newParamWeight <= 100, just add it as is
  if (oldTotal + newParamWeight <= 100) {
    return [
      ...existingParameters,
      { ...newParamObj, weightage: newParamWeight }
    ];
  }
  // Otherwise, scale existing parameters
  const remainingWeight = 100 - newParamWeight;
  const updated = existingParameters.map(p => ({
    ...p,
    weightage: oldTotal === 0 ? 0 : Math.round(((p.weightage || 0) / oldTotal) * remainingWeight)
  }));
  updated.push({ ...newParamObj, weightage: newParamWeight });
  let total = updated.reduce((sum, p) => sum + (p.weightage || 0), 0);
  if (total !== 100) {
    updated[updated.length - 1].weightage += 100 - total;
  }
  return updated;
}

// Delete a parameter and rescale
export function deleteParameterWithScaling(parameters, deleteId) {
  const filtered = parameters.filter(p => p.parameter_id !== deleteId);
  const total = filtered.reduce((sum, p) => sum + (p.weightage || 0), 0);
  const rescaled = filtered.map(p => ({
    ...p,
    weightage: total === 0 ? 0 : Math.round(((p.weightage || 0) / total) * 100)
  }));
  let newTotal = rescaled.reduce((sum, p) => sum + (p.weightage || 0), 0);
  if (newTotal !== 100 && rescaled.length > 0) {
    rescaled[rescaled.length - 1].weightage += 100 - newTotal;
  }
  return rescaled;
} 