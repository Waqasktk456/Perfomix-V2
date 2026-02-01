// src/screens/PerformanceMatrix/ParameterLibraryModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './ParameterLibraryModal.css';

const ParameterLibraryModal = ({ isOpen, onClose, onAddParameters, existingParameterIds = [] }) => {
    const [parameters, setParameters] = useState([]);
    const [filteredParameters, setFilteredParameters] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [view, setView] = useState('categories'); // 'categories' or 'parameters'

    const getAuthConfig = () => {
        const token = localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    useEffect(() => {
        if (isOpen) {
            fetchParameters();
            setSelectedIds(new Set());
            setView('categories');
            setSelectedCategory(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (view === 'parameters') {
            filterParameters();
        }
    }, [searchTerm, selectedCategory, parameters, view]);

    const fetchParameters = async () => {
        try {
            setLoading(true);
            const config = getAuthConfig();
            const response = await axios.get('http://localhost:5000/api/parameters', config);
            const allParams = response.data || [];
            setParameters(allParams);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching parameters:', error);
            toast.error('Failed to load parameter library');
            setLoading(false);
        }
    };

    const filterParameters = () => {
        let result = parameters;

        if (selectedCategory) {
            const lowerCat = selectedCategory.toLowerCase();
            result = result.filter(p => {
                const pCat = (p.category || '').toLowerCase();
                const pName = (p.parameter_name || '').toLowerCase();

                if (selectedCategory === 'University') {
                    return pCat.includes('university') || pCat.includes('academic') || pCat.includes('edu') ||
                        pName.includes('student') || pName.includes('research') || pName.includes('degree');
                }
                if (selectedCategory === 'Software House') {
                    return pCat.includes('software') || pCat.includes('it') || pCat.includes('tech') || pCat.includes('dev') ||
                        pName.includes('code') || pName.includes('test') || pName.includes('deploy');
                }
                return pCat.includes(lowerCat);
            });
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.parameter_name.toLowerCase().includes(lowerTerm) ||
                (p.description && p.description.toLowerCase().includes(lowerTerm))
            );
        }

        setFilteredParameters(result);
    };

    const handleCategorySelect = (cat) => {
        setSelectedCategory(cat);
        setView('parameters');
        setSearchTerm('');
    };

    const toggleSelection = (paramId) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(paramId)) {
            newSelected.delete(paramId);
        } else {
            newSelected.add(paramId);
        }
        setSelectedIds(newSelected);
    };

    const handleAdd = () => {
        const selectedParams = parameters.filter(p => selectedIds.has(p.id));
        onAddParameters(selectedParams);
        onClose();
    };

    const isAlreadyAdded = (paramId) => existingParameterIds.includes(paramId);

    if (!isOpen) return null;

    return (
        <div className="parameter-library-overlay" onClick={onClose}>
            <div className="parameter-library-modal" onClick={e => e.stopPropagation()}>
                <div className="library-header">
                    <div>
                        <h2>{view === 'categories' ? 'Choose Industry Category' : `${selectedCategory} Parameters`}</h2>
                        <p>{view === 'categories' ? 'Select an industry to explore related performance metrics' : 'Select parameters to add to your matrix'}</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                {view === 'parameters' && (
                    <div className="library-controls">
                        <button className="btn-back-categories" onClick={() => setView('categories')}>
                            ← Back to Categories
                        </button>
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder={`Search in ${selectedCategory}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                <div className="library-content" style={{ padding: '32px', backgroundColor: '#f9fafb', flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loading-spinner">Loading library...</div>
                    ) : view === 'categories' ? (
                        <div className="category-selection-grid">
                            <div className="category-selection-card" onClick={() => handleCategorySelect('University')}>
                                <div className="category-icon">🎓</div>
                                <h3>University Parameters</h3>
                                <p>Academic excellence, research output, and student engagement metrics.</p>
                                <button className="btn-explore-cat">Explore Parameters</button>
                            </div>
                            <div className="category-selection-card" onClick={() => handleCategorySelect('Software House')}>
                                <div className="category-icon">💻</div>
                                <h3>Software House</h3>
                                <p>Technical skill, code quality, project delivery, and innovation metrics.</p>
                                <button className="btn-explore-cat">Explore Parameters</button>
                            </div>
                        </div>
                    ) : (
                        <div className="library-parameter-grid">
                            {filteredParameters.length > 0 ? (
                                filteredParameters.map(param => {
                                    const added = isAlreadyAdded(param.id);
                                    const selected = selectedIds.has(param.id);
                                    return (
                                        <div
                                            key={param.id}
                                            className={`parameter-card ${selected ? 'selected' : ''} ${added ? 'disabled' : ''}`}
                                            onClick={() => !added && toggleSelection(param.id)}
                                            style={added ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f3f4f6', borderStyle: 'dashed' } : {}}
                                        >
                                            <div className="parameter-card-header">
                                                <span className="parameter-name">{param.parameter_name}</span>
                                                <div className="checkbox-indicator"></div>
                                            </div>

                                            <div style={{ marginBottom: '8px' }}>
                                                <span className="category-badge">{param.category || 'General'}</span>
                                            </div>

                                            <p className="parameter-description">
                                                {param.description || 'No description available.'}
                                            </p>

                                            {added && (
                                                <div style={{
                                                    marginTop: '12px',
                                                    fontSize: '12px',
                                                    color: '#10b981',
                                                    fontWeight: '700',
                                                    background: '#ecfdf5',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    display: 'inline-block'
                                                }}>
                                                    ✓ Already Added
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-results">
                                    <p>No parameters found in this category.</p>
                                    <button onClick={() => setView('categories')} className="btn-back-categories" style={{ marginTop: '10px' }}>
                                        Try another category
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="library-footer">
                    <span className="selection-count">
                        {selectedIds.size} parameter{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="library-actions">
                        <button className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button
                            className="btn-add-selected"
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0}
                        >
                            Add Selected Parameters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParameterLibraryModal;
