-- Add course column to subtopics
alter table subtopics add column if not exists course text not null default 'aa';

-- Add course column to exams
alter table exams add column if not exists course text not null default 'aa';

-- Tag Math AI-specific subtopics
update subtopics set course = 'ai' where subtopic in (
  'Number Skills', 'Financial Mathematics', 'Systems of Equations',
  'Linear Functions', 'Voronoi Diagrams', 'Hypothesis Testing',
  'Differentiation', 'Integration'
);

-- Shared subtopics (exist in both AA and AI)
update subtopics set course = 'both' where subtopic in (
  'Sequences', 'Properties of Functions', 'Quadratics',
  'Exponent and Log Functions', 'Geometry and Shapes',
  'Trigonometric Functions', 'Statistics', 'Bivariate Statistics',
  'Probability', 'Distributions'
);

-- Everything else stays 'aa' (Binomial Theorem, Exponents and Logs, Proofs, Rational Functions, Transformations)
