import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './LineManagerEvaluation.css';

const LineManagerEvaluationScreen = () => {
  const navigate = useNavigate();
  const [lineManagers, setLineManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLineManager, setSelectedLineManager] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  
  // Search states
  const [searchType, setSearchType] = useState("name");
  const [searchValue, setSearchValue] = useState("");

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("No authentication token found. Please login again.");
      navigate('/login');
      throw new Error("No token");
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchLineManagers();
    } else {
      setLineManagers([]);
      setLoading(false);
    }
  }, [selectedCycleId]);

  const fetchCycles = async () => {
    try {
      const config = getAuthConfig();
      const response = await axios.get('http://localhost:5000/api/cycles', config);
      const cyclesData = Array.isArray(response.data) ? response.data : [];
      setCycles(cyclesData);
      
      // Automatically select the most recent cycle (first in the list)
      if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching cycles:', error);
      toast.error('Failed to fetch evaluation cycles');
    }
  };

  const fetchLineManagers = async () => {
    if (!selectedCycleId) {
      setLineManagers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config = getAuthConfig();
      
      // Fetch only line managers who have been assigned teams in the selected cycle
      const response = await axios.get(
        `http://localhost:5000/api/cycles/${selectedCycleId}/line-managers`,
        config
      );

      console.log('Fetched line managers for cycle:', response.data);
      
      if (response.data && response.data.length > 0) {
        console.log('Sample line manager:', {
          name: `${response.data[0].first_name} ${response.data[0].last_name}`,
          total_evaluations: response.data[0].total_evaluations,
          completed_evaluations: response.data[0].completed_evaluations,
          pending_count: response.data[0].pending_count,
          evaluation_status: response.data[0].evaluation_status,
          admin_evaluation_status: response.data[0].admin_evaluation_status
        });
      }
      
      setLineManagers(response.data || []);
    } catch (err) {
      console.error('Error fetching line managers:', err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate('/login');
      } else {
        setError('Failed to fetch line managers');
      }
      setLineManagers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (manager) => {
    setSelectedLineManager(manager);
  };

  const handleEvaluate = async () => {
    if (!selectedCycleId) {
      toast.error('Please select an evaluation cycle first');
      return;
    }
    if (!selectedLineManager) {
      toast.error('Please select a line manager first');
      return;
    }

    try {
      const config = getAuthConfig();
      
      // Check if line manager has completed all their staff evaluations
      const checkResponse = await axios.get(
        `http://localhost:5000/api/line-manager/check-completion/${selectedLineManager.id}/${selectedCycleId}`,
        config
      );

      if (!checkResponse.data.allCompleted) {
        toast.error(
          `This line manager has ${checkResponse.data.pendingCount} pending staff evaluations. ` +
          `They must complete all staff evaluations before being evaluated.`
        );
        return;
      }

      // Proceed to evaluation page
      navigate(`/evaluate-linemanager/${selectedLineManager.id}`, {
        state: {
          lineManagerId: selectedLineManager.id,
          lineManagerName: `${selectedLineManager.first_name} ${selectedLineManager.last_name}`,
          lineManagerEmail: selectedLineManager.email,
          department: selectedLineManager.department_name,
          designation: selectedLineManager.designation,
          cycleId: selectedCycleId,
          cycleName: cycles.find(c => c.id === parseInt(selectedCycleId))?.name || cycles.find(c => c.id === parseInt(selectedCycleId))?.cycle_name
        }
      });
    } catch (error) {
      console.error('Error checking line manager completion:', error);
      toast.error('Failed to check evaluation status');
    }
  };

  const handleViewPerformance = () => {
    if (!selectedCycleId) {
      toast.error('Please select an evaluation cycle first');
      return;
    }
    if (!selectedLineManager) {
      toast.error('Please select a line manager first');
      return;
    }

    navigate('/line-manager-performance', {
      state: {
        lineManagerId: selectedLineManager.id,
        lineManagerName: `${selectedLineManager.first_name} ${selectedLineManager.last_name}`,
        lineManagerEmail: selectedLineManager.email,
        department: selectedLineManager.department_name,
        designation: selectedLineManager.designation,
        cycleId: selectedCycleId,
        cycleName: cycles.find(c => c.id === parseInt(selectedCycleId))?.name || cycles.find(c => c.id === parseInt(selectedCycleId))?.cycle_name,
        assignedTeamsCount: selectedLineManager.assigned_teams_count,
        completedEvaluations: selectedLineManager.completed_evaluations,
        totalEvaluations: selectedLineManager.total_evaluations
      }
    });
  };

  const handleViewTeamsPerformance = () => {
    if (!selectedCycleId) {
      toast.error('Please select an evaluation cycle first');
      return;
    }
    if (!selectedLineManager) {
      toast.error('Please select a line manager first');
      return;
    }

    navigate('/line-manager-teams-performance', {
      state: {
        lineManagerId: selectedLineManager.id,
        lineManagerName: `${selectedLineManager.first_name} ${selectedLineManager.last_name}`,
        cycleId: selectedCycleId,
        cycleName: cycles.find(c => c.id === parseInt(selectedCycleId))?.name || cycles.find(c => c.id === parseInt(selectedCycleId))?.cycle_name
      }
    });
  };

  // Filter line managers based on search
  const filteredLineManagers = lineManagers.filter(manager => {
    if (!searchValue.trim()) return true;

    const value = searchValue.toLowerCase();

    switch (searchType) {
      case "name":
        return `${manager.first_name} ${manager.last_name}`.toLowerCase().includes(value);

      case "department":
        return manager.department_name?.toLowerCase().includes(value);

      default:
        return true;
    }
  });

  if (loading) {
    return <div className="loading">Loading line managers...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="lm-eval-container">
      {/* Evaluation Cycle Selection */}
      <div style={{ marginBottom: '20px' }}>
        <select
          className="cycle-select"
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          style={{ 
            padding: '8px 12px', 
            borderRadius: '4px', 
            border: '1px solid #ddd',
            fontSize: '14px',
            color: '#6b7280',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '250px'
          }}
        >
          <option value="">Select Evaluation Cycle</option>
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>{cycle.name || cycle.cycle_name}</option>
          ))}
        </select>
      </div>

      {/* Search Bar */}
      <div className="search-container-main" style={{ marginBottom: '20px' }}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input-field"
            placeholder={`Search by ${searchType}...`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

        <div className="search-type-buttons">
          <button
            className={`search-type-btn ${searchType === 'name' ? 'active' : ''}`}
            onClick={() => setSearchType('name')}
          >
            Name
          </button>
          <button
            className={`search-type-btn ${searchType === 'department' ? 'active' : ''}`}
            onClick={() => setSearchType('department')}
          >
            Department
          </button>
        </div>
      </div>

      {lineManagers.length === 0 ? (
        <div className="empty-state">
          <p className="empty-message-dept">There are no Line Managers yet</p>
        </div>
      ) : (
        <>
          <div className="lm-table-container-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>SR No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Staff Eval.<br/>Status</th>
                  <th>Admin Eval.<br/>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredLineManagers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center" }}>
                      No line manager found
                    </td>
                  </tr>
                ) : (
                  filteredLineManagers.map((manager, index) => (
                    <tr
                      key={manager.id}
                      onClick={() => handleRowClick(manager)}
                      className={
                        selectedLineManager?.id === manager.id
                          ? "selected-row"
                          : ""
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td>{index + 1}</td>
                      <td>{manager.first_name} {manager.last_name}</td>
                      <td><a href={`mailto:${manager.email}`}>{manager.email}</a></td>
                      <td>{manager.department_name || "N/A"}</td>
                      <td>{manager.designation || "N/A"}</td>
                      <td>
                        {manager.evaluation_status === 'Completed' ? (
                          <span className="status-badge completed">
                            Completed
                          </span>
                        ) : (
                          <span className="status-badge pending">
                            Pending ({manager.pending_count || manager.total_evaluations || 0})
                          </span>
                        )}
                      </td>
                      <td>
                        {manager.admin_evaluation_status === 'Evaluated' ? (
                          <span className="status-badge evaluated">
                            Evaluated
                          </span>
                        ) : (
                          <span className="status-badge not-evaluated">
                            Not Evaluated
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            className="organization-view-details-btn"
            onClick={handleViewPerformance}
            disabled={!selectedLineManager || !selectedCycleId}
            style={{
              opacity: (selectedLineManager && selectedCycleId) ? 1 : 0.5,
              cursor: (selectedLineManager && selectedCycleId) ? 'pointer' : 'not-allowed',
              position: "fixed",
              bottom: 16,
              right: 30,
            }}
          >
            View Performance
          </button>

          <button
            className="organization-view-details-btn"
            onClick={handleViewTeamsPerformance}
            disabled={!selectedLineManager || !selectedCycleId}
            style={{
              opacity: (selectedLineManager && selectedCycleId) ? 1 : 0.5,
              cursor: (selectedLineManager && selectedCycleId) ? 'pointer' : 'not-allowed',
              position: "fixed",
              bottom: 16,
              right: 230,
            }}
          >
            View Teams Performance
          </button>

          <button
            className="organization-view-details-btn"
            onClick={handleEvaluate}
            disabled={!selectedLineManager}
            style={{
              opacity: selectedLineManager ? 1 : 0.5,
              cursor: selectedLineManager ? 'pointer' : 'not-allowed',
              position: "fixed",
              bottom: 16,
              right: 460,
            }}
          >
            Evaluate Line Manager
          </button>
        </>
      )}
    </div>
  );
};

export default LineManagerEvaluationScreen;
