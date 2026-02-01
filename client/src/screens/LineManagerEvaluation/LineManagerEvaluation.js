import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './LineManagerEvaluation.css';

const LineManagerEvaluationScreen = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvaluators, setLoadingEvaluators] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  };

  useEffect(() => {
    fetchDepartments();
  }, [retryCount]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchEvaluators(selectedDepartment);
    } else {
      setEvaluators([]);
    }
  }, [selectedDepartment]);

  const validateDepartmentResponse = (response) => {
    if (!response || !response.data) {
      throw new Error('Invalid server response');
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    if (response.data.departments && Array.isArray(response.data.departments)) {
      return response.data.departments;
    }

    throw new Error('Invalid departments data format');
  };

  const validateEvaluatorResponse = (response) => {
    if (!response || !response.data) {
      throw new Error('Invalid server response');
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    if (response.data.employees && Array.isArray(response.data.employees)) {
      return response.data.employees;
    }

    throw new Error('Invalid evaluators data format');
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('http://localhost:5000/api/departments', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthConfig()
        }
      });

      console.log('Department Response:', response.data);

      const departmentsData = validateDepartmentResponse(response);

      console.log('Validated departments data:', departmentsData);
      console.log('Departments data length:', departmentsData.length);
      if (departmentsData.length > 0) {
        console.log('First department object:', departmentsData[0]);
        console.log('Department fields:', Object.keys(departmentsData[0]));
      }

      if (departmentsData.length === 0) {
        setError('No departments found. Please contact your administrator.');
        setDepartments([]);
      } else {
        console.log('Setting departments state with:', departmentsData);
        setDepartments(departmentsData);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      let errorMessage = 'Failed to fetch departments';

      if (error.response) {
        errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluators = async (departmentCode) => {
    try {
      setLoadingEvaluators(true);
      setError(null);

      const response = await axios.get(
        'http://localhost:5000/api/employees/role/Line%20Manager',
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...getAuthConfig()
          }
        }
      );

      console.log('Evaluator Response:', response.data);

      const allEvaluators = validateEvaluatorResponse(response);

      const evaluatorsData = allEvaluators.filter(
        evaluator => evaluator.Department_code === departmentCode
      );

      if (evaluatorsData.length === 0) {
        setError('No evaluators found in this department');
        setEvaluators([]);
        return;
      }

      const evaluatorsWithStatus = await Promise.all(
        evaluatorsData.map(async (evaluator) => {
          try {
            const evalResponse = await axios.get(
              `http://localhost:5000/api/evaluations/completed/${evaluator.Employee_id}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  ...getAuthConfig()
                }
              }
            );

            console.log('Evaluation Response:', evalResponse.data);

            if (!evalResponse.data?.evaluations || evalResponse.data.evaluations.length === 0) {
              return {
                ...evaluator,
                last_evaluation_date: null,
                last_evaluation_score: null
              };
            }

            const latestEvaluation = evalResponse.data.evaluations[0];

            const totalScore = evalResponse.data.evaluations.reduce((sum, evaluation) => {
              return sum + ((Number(evaluation.weightage) || 0) / 100) * (Number(evaluation.score) || 0);
            }, 0);

            return {
              ...evaluator,
              last_evaluation_date: latestEvaluation.evaluation_date || null,
              last_evaluation_score: Math.round(totalScore)
            };
          } catch (error) {
            console.warn(`Could not fetch evaluation for ${evaluator.Employee_id}:`, error);
            return {
              ...evaluator,
              last_evaluation_date: null,
              last_evaluation_score: null
            };
          }
        })
      );

      setEvaluators(evaluatorsWithStatus);
    } catch (error) {
      console.error('Error fetching evaluators:', error);
      let errorMessage = 'Failed to fetch evaluators';

      if (error.response) {
        errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setEvaluators([]);
    } finally {
      setLoadingEvaluators(false);
    }
  };

  const fetchEmployeesForEvaluator = async (evaluatorId) => {
    try {
      setLoadingEmployees(true);
      setError(null);

      // Get the evaluator's department code
      const evaluator = evaluators.find(e => e.Employee_id === evaluatorId);
      if (!evaluator) {
        setError('Evaluator not found');
        setEmployees([]);
        return;
      }

      // Fetch employees in the same department
      const response = await axios.get(
        `http://localhost:5000/api/employees/department/${evaluator.Department_code}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...getAuthConfig()
          }
        }
      );

      console.log('Employees Response:', response.data);

      if (!response.data || !Array.isArray(response.data)) {
        setError('No employees found in this department');
        setEmployees([]);
        return;
      }

      // Filter out the line manager from the employees list
      const employeesData = response.data.filter(emp => emp.Employee_id !== evaluatorId);

      // Fetch evaluation status for each employee
      const employeesWithStatus = await Promise.all(
        employeesData.map(async (employee) => {
          try {
            const evalResponse = await axios.get(
              `http://localhost:5000/api/evaluations/completed/${employee.Employee_id}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  ...getAuthConfig()
                }
              }
            );

            if (!evalResponse.data?.evaluations || evalResponse.data.evaluations.length === 0) {
              return {
                ...employee,
                last_evaluation_date: null,
                last_evaluation_score: null
              };
            }

            const latestEvaluation = evalResponse.data.evaluations[0];

            const totalScore = evalResponse.data.evaluations.reduce((sum, evaluation) => {
              return sum + ((Number(evaluation.weightage) || 0) / 100) * (Number(evaluation.score) || 0);
            }, 0);

            return {
              ...employee,
              last_evaluation_date: latestEvaluation.evaluation_date || null,
              last_evaluation_score: Math.round(totalScore)
            };
          } catch (error) {
            console.warn(`Could not fetch evaluation for ${employee.Employee_id}:`, error);
            return {
              ...employee,
              last_evaluation_date: null,
              last_evaluation_score: null
            };
          }
        })
      );

      setEmployees(employeesWithStatus);
    } catch (error) {
      console.error('Error fetching employees:', error);
      let errorMessage = 'Failed to fetch employees';

      if (error.response) {
        errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    setSearchTerm('');
    setError(null);
    setSelectedEvaluator(null);
    setEmployees([]);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
  };

  const handleEvaluate = (evaluator) => {
    navigate(`/evaluate-linemanager/${evaluator.Employee_id}`);
  };

  const handleEvaluateEmployee = (employee) => {
    navigate(`/evaluate-employee/${employee.Employee_id}`, {
      state: {
        employee,
        evaluator: selectedEvaluator,
        returnPath: '/linemanager-evaluation'
      }
    });
  };

  const filteredEvaluators = evaluators.filter(evaluator => {
    const fullName = `${evaluator.First_name} ${evaluator.Last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.First_name} ${employee.Last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const getEvaluationStatus = (evaluator) => {
    if (!evaluator.last_evaluation_date) return 'Not Evaluated';
    const lastEvalDate = new Date(evaluator.last_evaluation_date);
    const today = new Date();
    const monthsSinceLastEval = (today.getFullYear() - lastEvalDate.getFullYear()) * 12 +
      (today.getMonth() - lastEvalDate.getMonth());

    if (monthsSinceLastEval >= 6) return 'Due';
    return 'Up to Date';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Not Evaluated':
        return 'lm-eval-status not-evaluated';
      case 'Due':
        return 'lm-eval-status due';
      case 'Up to Date':
        return 'lm-eval-status up-to-date';
      default:
        return 'lm-eval-status';
    }
  };

  if (loading && !departments.length) {
    return (
      <div className="lm-eval-container">
        <div className="lm-eval-loading">
          <div className="lm-eval-loading-spinner"></div>
          <p>Loading departments...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedDepartment) {
    return (
      <div className="lm-eval-container">
        <div className="lm-eval-error">
          <p>{error}</p>
          <button onClick={handleRetry} className="lm-eval-retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lm-eval-container" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="lm-eval-breadcrumb">
        <span>Performance Management</span>
        <span className="separator">›</span>
        <span className="active">Line Manager Evaluation</span>
      </div>

      <div className="lm-eval-content" style={{ maxWidth: '100%', width: '100%' }}>
        <div className="lm-eval-header">
          <h2>Line Manager Evaluation</h2>
        </div>

        <div className="lm-eval-filters">
          <div className="lm-eval-filter-group">
            <label>Department</label>
            <select
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              className="lm-eval-select"
              disabled={loading}
            >
              <option value="">Select Department</option>
              {departments && departments.map((dept, index) => (
                <option
                  key={dept.department_code || dept.Department_code || dept.id || index}
                  value={dept.department_code || dept.Department_code}
                >
                  {dept.department_name || dept.Department_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedDepartment ? (
          <div className="lm-eval-departments-list">
            <div className="lm-eval-department-section">
              {loadingEvaluators ? (
                <div className="lm-eval-loading">
                  <div className="lm-eval-loading-spinner"></div>
                  <p>Loading evaluators...</p>
                </div>
              ) : error ? (
                <div className="lm-eval-error">
                  <p>{error}</p>
                  <button onClick={() => fetchEvaluators(selectedDepartment)} className="lm-eval-retry-btn">
                    Retry
                  </button>
                </div>
              ) : (
                <div className="lm-eval-table-wrapper" style={{ maxWidth: '100%', width: '100%' }}>
                  <table className="lm-eval-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvaluators.length > 0 ? (
                        filteredEvaluators.map(evaluator => {
                          let status = 'Not Evaluated';
                          if (evaluator.last_evaluation_score && evaluator.last_evaluation_score > 0) {
                            status = 'Completed';
                          }
                          return (
                            <tr key={evaluator.Employee_id}>
                              <td>{`${evaluator.First_name} ${evaluator.Last_name}`}</td>
                              <td>{evaluator.Email}</td>
                              <td>{evaluator.Role}</td>
                              <td>
                                {evaluator.last_evaluation_score !== null && evaluator.last_evaluation_score !== undefined
                                  ? evaluator.last_evaluation_score
                                  : 'N/A'}
                              </td>
                              <td>
                                <span className={status === 'Completed' ? 'lm-eval-status lm-eval-status-completed' : 'lm-eval-status lm-eval-status-pending'}>
                                  {status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="lm-eval-action-btn"
                                  onClick={() => handleEvaluate(evaluator)}
                                >
                                  Evaluate
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="6">No evaluators found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lm-eval-no-department">
            Please select a department to view evaluators
          </div>
        )}
      </div>
    </div>
  );
};

export default LineManagerEvaluationScreen; 