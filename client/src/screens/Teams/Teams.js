import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Teams.css";
import { EditIcon, DeleteIcon, NoDepartmentImg, Noteam } from "../../assets";
import '../../styles/typography.css';
import axios from 'axios';

const Teams = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Helper function to get axios config with token
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error("No authentication token found");
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = getAuthConfig();
      const response = await axios.get("http://localhost:5000/api/teams", config);
      console.log('Fetched Teams:', response.data);
      setTeams(response.data);
    } catch (err) {
      console.error("Error fetching Teams:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        navigate('/login');
      } else {
        setError("Failed to fetch Teams");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team) => {
    console.log(`Checking team ${team.team_name}: active_cycle=${team.is_in_active_cycle}`);
    if (team.is_in_active_cycle > 0) {
      toast.error("Team is in an active cycle cannot be edit or delete");
      return;
    }
    navigate(`/add-team/${team.id}`);
  };

  const handleDelete = async (team) => {
    console.log(`Checking delete team ${team.team_name}: active_cycle=${team.is_in_active_cycle}`);
    if (team.is_in_active_cycle > 0) {
      toast.error("Team is in an active cycle cannot be edit or delete");
      return;
    }

    if (window.confirm(`Are you sure you want to delete team "${team.team_name}"?`)) {
      try {
        const config = getAuthConfig();
        await axios.delete(`http://localhost:5000/api/teams/${team.id}`, config);
        toast.success("Team deleted successfully");
        fetchTeams();
      } catch (err) {
        console.error('Error deleting team:', err);
        const errorMsg = err.response?.data?.error || 'Failed to delete team';
        toast.error(errorMsg);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading teams...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="departments-container">
      <button className="add-team-btn" onClick={() => navigate('/add-team')}> Add Team</button>
      {teams.length === 0 ? (
        <div className="empty-state">
          <img
            src={Noteam}
            alt="No Teams"
            className="no-department-img"
          />
          <p className="empty-message-dept">There is no Teams yet</p>
        </div>
      ) : (
        <>
          <table className="departments-table">
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Team Department</th>
                <th>No of Employees</th>
                <th>Action</th>

              </tr>
            </thead>
            <tbody>
              {
                teams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.team_name}</td>
                    <td>{team.department_name || 'N/A'}</td>
                    <td>{team.number_of_members}</td>
                    <td>
                      <button
                        onClick={() => handleEdit(team)}
                        className="organization-icon-button"
                        aria-label="Edit Team"
                        title="Edit Team"
                      >
                        <img
                          src={EditIcon}
                          alt="Edit"
                          className="organization-icon organization-edit-icon"
                        />
                      </button>
                      <span>/</span>
                      <button
                        onClick={() => handleDelete(team)}
                        className="organization-icon-button"
                        aria-label="Delete Team"
                        title="Delete Team"
                      >
                        <img
                          src={DeleteIcon}
                          alt="Delete"
                          className="organization-icon organization-delete-icon"
                        />
                      </button>
                    </td>

                  </tr>
                ))
              }
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default Teams;
