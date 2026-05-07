-- Add Math AI subtopics
insert into subtopics (topic, subtopic, display_order) values
  ('Number and Algebra', 'Number Skills',          5),
  ('Number and Algebra', 'Financial Mathematics',  35),
  ('Number and Algebra', 'Systems of Equations',   45)
on conflict (topic, subtopic) do nothing;

-- Add Linear Functions subtopic
insert into subtopics (topic, subtopic, display_order) values
  ('Functions', 'Linear Functions', 48)
on conflict (topic, subtopic) do nothing;

-- Add Voronoi Diagrams subtopic
insert into subtopics (topic, subtopic, display_order) values
  ('Geometry and Trigonometry', 'Voronoi Diagrams', 115)
on conflict (topic, subtopic) do nothing;

-- Add Hypothesis Testing subtopic
insert into subtopics (topic, subtopic, display_order) values
  ('Statistics and Probability', 'Hypothesis Testing', 155)
on conflict (topic, subtopic) do nothing;

-- Add Calculus subtopics
insert into subtopics (topic, subtopic, display_order) values
  ('Calculus', 'Differentiation', 160),
  ('Calculus', 'Integration',     170)
on conflict (topic, subtopic) do nothing;
