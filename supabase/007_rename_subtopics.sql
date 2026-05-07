-- Rename subtopics to match Math AI curriculum names
update subtopics set subtopic = 'Trigonometry' where subtopic = 'Trigonometric Functions';
update subtopics set subtopic = '3D Geometry & Shapes' where subtopic = 'Geometry and Shapes';
update subtopics set subtopic = 'Linear Equations & Graphs' where subtopic = 'Linear Functions';

-- Add Applications of Functions as AI-specific subtopic
insert into subtopics (topic, subtopic, display_order, course)
values ('Functions', 'Applications of Functions', 55, 'ai')
on conflict (topic, subtopic) do nothing;

-- Make sure course column exists (run 006 first if not done)
alter table subtopics add column if not exists course text not null default 'aa';
alter table exams add column if not exists course text not null default 'aa';

-- Re-apply course tags after renames
update subtopics set course = 'ai' where subtopic in (
  'Number Skills', 'Financial Mathematics', 'Systems of Equations',
  'Linear Equations & Graphs', 'Voronoi Diagrams', 'Hypothesis Testing',
  'Differentiation', 'Integration', 'Applications of Functions'
);

update subtopics set course = 'both' where subtopic in (
  'Sequences', 'Properties of Functions', 'Quadratics',
  'Exponent and Log Functions', '3D Geometry & Shapes',
  'Trigonometry', 'Statistics', 'Bivariate Statistics',
  'Probability', 'Distributions'
);
