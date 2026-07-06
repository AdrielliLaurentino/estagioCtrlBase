import React from "react";
import { Eye, EyeOff } from "lucide-react"; 

const InputSmart = ({ 
  label, name, value, onChange, onBlur, 
  type = "text", isPassword, showPassState, setShowPassState, maxLength 
}) => {
  const inputType = isPassword ? (showPassState ? "text" : "password") : type;

  return (
    <div className="floating-group">
      <input
        type={inputType}
        name={name}
        className="floating-input"
        placeholder=" " 
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={maxLength}
        required
      />
      <label className="floating-label">{label}</label>
      
      {isPassword && (
        <button type="button" className="password-toggle-btn" onClick={() => setShowPassState(!showPassState)}>
          {showPassState ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
};

export default InputSmart;