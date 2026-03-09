-- Create performance_ratings table
CREATE TABLE IF NOT EXISTS performance_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    min_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    color VARCHAR(7) NOT NULL,
    bg_color VARCHAR(7),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_score_range CHECK (min_score >= 0 AND max_score <= 100 AND min_score < max_score),
    CONSTRAINT unique_org_name UNIQUE (organization_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add rating columns to evaluations table
ALTER TABLE evaluations 
ADD COLUMN rating_id INT NULL,
ADD COLUMN rating_name VARCHAR(50) NULL,
ADD CONSTRAINT fk_evaluations_rating FOREIGN KEY (rating_id) REFERENCES performance_ratings(id) ON DELETE SET NULL;

-- Insert default ratings for existing organizations
INSERT INTO performance_ratings (organization_id, name, min_score, max_score, color, bg_color, display_order)
SELECT 
    o.id,
    'Excellent',
    90.00,
    100.00,
    '#4CAF50',
    '#E8F5E9',
    1
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_ratings pr 
    WHERE pr.organization_id = o.id AND pr.name = 'Excellent'
);

INSERT INTO performance_ratings (organization_id, name, min_score, max_score, color, bg_color, display_order)
SELECT 
    o.id,
    'Very Good',
    80.00,
    89.99,
    '#8BC34A',
    '#F1F8E9',
    2
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_ratings pr 
    WHERE pr.organization_id = o.id AND pr.name = 'Very Good'
);

INSERT INTO performance_ratings (organization_id, name, min_score, max_score, color, bg_color, display_order)
SELECT 
    o.id,
    'Good',
    70.00,
    79.99,
    '#FFC107',
    '#FFF9C4',
    3
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_ratings pr 
    WHERE pr.organization_id = o.id AND pr.name = 'Good'
);

INSERT INTO performance_ratings (organization_id, name, min_score, max_score, color, bg_color, display_order)
SELECT 
    o.id,
    'Satisfactory',
    60.00,
    69.99,
    '#FF9800',
    '#FFE0B2',
    4
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_ratings pr 
    WHERE pr.organization_id = o.id AND pr.name = 'Satisfactory'
);

INSERT INTO performance_ratings (organization_id, name, min_score, max_score, color, bg_color, display_order)
SELECT 
    o.id,
    'Needs Improvement',
    0.00,
    59.99,
    '#F44336',
    '#FFEBEE',
    5
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM performance_ratings pr 
    WHERE pr.organization_id = o.id AND pr.name = 'Needs Improvement'
);
