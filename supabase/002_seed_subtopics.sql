insert into subtopics (topic, subtopic, display_order) values
  -- Number and Algebra
  ('Number and Algebra', 'Binomial Theorem',       10),
  ('Number and Algebra', 'Exponents and Logs',     20),
  ('Number and Algebra', 'Sequences',              30),
  ('Number and Algebra', 'Proofs',                 40),
  -- Functions
  ('Functions', 'Properties of Functions',         50),
  ('Functions', 'Quadratics',                      60),
  ('Functions', 'Rational Functions',              70),
  ('Functions', 'Exponent and Log Functions',      80),
  ('Functions', 'Transformations',                 90),
  -- Geometry and Trigonometry
  ('Geometry and Trigonometry', 'Geometry and Shapes',      100),
  ('Geometry and Trigonometry', 'Trigonometric Functions',  110),
  -- Statistics and Probability
  ('Statistics and Probability', 'Statistics',              120),
  ('Statistics and Probability', 'Bivariate Statistics',   130),
  ('Statistics and Probability', 'Probability',            140),
  ('Statistics and Probability', 'Distributions',          150)
on conflict (topic, subtopic) do nothing;
