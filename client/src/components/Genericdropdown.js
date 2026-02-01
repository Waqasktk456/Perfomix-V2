import './Genericdropdown.css'
const Dropdown = ({ label, options, id, onChange, value }) => {
  
    return (
      <div className="dropdown-container">
        <label htmlFor={id} className="dropdown-label">
          {label}
        </label>
        <select id={id} className="dropdown" onChange={onChange} value={value}>
          <option value="">Select an Option</option>
          {options?.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };
  
  export default Dropdown;
  