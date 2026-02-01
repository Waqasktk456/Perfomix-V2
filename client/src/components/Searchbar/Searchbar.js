import React from "react";
import "./Searchbar.css";
import '../../styles/typography.css';

const SearchBar = ({ placeholder = "Search" }) => {
  return (
    <div className="parent-container"> 
      <div className="search-container">
        <input type="text" placeholder={placeholder} className="search-input" />
      </div>
    </div>
  );
};

export default SearchBar;
