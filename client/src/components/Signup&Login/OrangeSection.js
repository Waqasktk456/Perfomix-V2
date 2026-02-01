import React from 'react';
import './OrangeSections.css';

const OrangeSection = ({
  text,
  iconImage,
  iconAlt = 'Icon',
  mainImage,
  mainImageAlt = 'Illustration',
  className = '',
}) => (
  <div className={`orange-section ${className}`}>
    {/* Circle with icon */}
    <div className="circle-container">
      <img src={iconImage} alt={iconAlt} className="icon-image" />
    </div>
    {/* Text */}
    <p className="orange-text">{text}</p>
    {/* Main Image */}
    <div className="image-container">
      <img src={mainImage} alt={mainImageAlt} className="main-image" />
    </div>
  </div>
);

export default OrangeSection;
