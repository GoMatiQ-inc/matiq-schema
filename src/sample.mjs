export const sample = `// Platform starter · illustrative sample, not a production schema
// Edit the DBML to update the diagram.

Project platform_starter {
  database_type: 'PostgreSQL'
  Note: 'A small local schema to explore.'
}

Table tenants {
  id uuid [pk]
  name varchar(160) [not null]
  created_at timestamp [not null]
}

Table users {
  id uuid [pk]
  email varchar(255) [unique, not null]
  display_name varchar(160)
}

Table memberships {
  id uuid [pk]
  tenant_id uuid [not null, ref: > tenants.id]
  user_id uuid [not null, ref: > users.id]
  role varchar(32) [not null]
}

Table projects {
  id uuid [pk]
  tenant_id uuid [not null, ref: > tenants.id]
  name varchar(200) [not null]
  created_at timestamp
}

Table tasks {
  id uuid [pk]
  project_id uuid [not null, ref: > projects.id]
  assigned_to uuid [ref: >? users.id]
  title varchar(255) [not null]
  status varchar(32)
}

Table comments {
  id uuid [pk]
  task_id uuid [not null, ref: > tasks.id]
  author_id uuid [not null, ref: > users.id]
  body text [not null]
}
`;
