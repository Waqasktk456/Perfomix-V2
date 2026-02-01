// LineManager/screens/performance-evaluation.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardGrid from "../components/CardGrid"; // make sure this path is correct
import axios from "axios";
import { toast } from 'react-toastify';

const PerformanceEvaluation = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssignedTeams = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Session expired. Please login again.");
          navigate("/login");
          return;
        }

        setLoading(true);
        setError(null);

        const response = await axios.get(
          "http://localhost:5000/api/line-manager/assigned-teams",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Full API response:", response.data);

        if (!response.data.success) {
          throw new Error(response.data.message || "API returned failure");
        }

        const teams = response.data.teams || [];

        if (!Array.isArray(teams)) {
          throw new Error("Invalid data format: teams is not an array");
        }

        if (teams.length === 0) {
          toast.info("No teams assigned to you in any active cycle yet.");
        }

        // Map to CardGrid expected format
        const mappedItems = teams.map((team) => ({
          title: team.team_name || "Unnamed Team",
          description: `${team.employee_count || 0} employees to evaluate`,
          matrixName: team.matrix_name || "No Matrix Assigned",
          department: team.department_name || "N/A",
          teamId: team.team_id,
          matrixId: team.matrix_id,
          assignmentId: team.assignment_id,
          cycleId: team.cycle_id,
          cyclePeriod: team.cycle_period || "N/A",
          progress: team.completed_evaluations && team.employee_count
            ? Math.round((team.completed_evaluations / team.employee_count) * 100)
            : 0,
        }));

        setItems(mappedItems);
      } catch (err) {
        console.error("Failed to fetch assigned teams:", err);
        const errorMsg = err.response?.data?.message || err.message || "Unknown error";
        setError(errorMsg);
        toast.error(`Failed to load teams: ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedTeams();
  }, [navigate]);

  const handleCardClick = (item) => {
    if (!item.teamId || !item.matrixId || !item.assignmentId) {
      toast.error("Incomplete team data. Cannot proceed to evaluation.");
      return;
    }

    navigate("/evaluate-employee-all", {
      state: {
        teamName: item.title,
        teamId: item.teamId,
        matrixId: item.matrixId,
        matrixName: item.matrixName,
        department: item.department,
        assignmentId: item.assignmentId,
        cycleId: item.cycleId,
        employeeCount: parseInt(item.description.split(" ")[0]) || 0
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", fontSize: "18px" }}>
        Loading your assigned teams...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "8px", fontSize: "28px" }}>My Assigned Teams</h1>
      <p style={{ color: "#555", marginBottom: "40px", fontSize: "16px" }}>
        Select a team below to evaluate its members using the assigned performance matrix.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "#f8f9fa",
            borderRadius: "12px",
            color: "#666",
          }}
        >
          <h3 style={{ marginBottom: "12px" }}>No Teams Assigned Yet</h3>
          <p>An active evaluation cycle with team assignments is required.</p>
          <p style={{ marginTop: "20px" }}>
            Contact your admin if you believe this is an error.
          </p>
        </div>
      ) : (
        <CardGrid
          items={items}
          onCardClick={handleCardClick}
          onViewAll={() =>
            toast.info("Click any team card to start evaluating its members")
          }
        />
      )}
    </div>
  );
};

export default PerformanceEvaluation;