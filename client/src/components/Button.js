import "./Button.css";

const Button = ({ title, onClick, type = "button", className = "" }) => {
  return (
    <button type={type} onClick={onClick} className={`button ${className}`}>
      {title}
    </button>
  );
};

export default Button;
