import React from "react";
import "./CardGrid.css";
import { ArrowsIcon } from "../../assets";

const CardGrid = ({ items = [], onViewAll, onCardClick }) => {
  return (
    <div className="pg-card-grid-wrapper">
      <div className="pg-card-container">
        {items.map((item, index) => (
          <div
            className="pg-card"
            key={index}
            onClick={() => onCardClick?.(item)}
            style={{ cursor: onCardClick ? "pointer" : "default" }}
          >
            <h3>{item.title}</h3>
            <p className="pg-description">{item.description}</p>
            <p className="pg-matrix-name">{item.matrixName}</p>
           <span className="pg-arrow">
  <img src={ArrowsIcon} alt="Arrow" style={{ width: '16px', height: '16px' }} />
</span>

          </div>
        ))}
      </div>
      {onViewAll && (
        <div className="pg-view-all-wrapper">
          <button className="pg-view-all" onClick={onViewAll}>
            View All
          </button>
        </div>
      )}
    </div>
  );
};

export default CardGrid;
