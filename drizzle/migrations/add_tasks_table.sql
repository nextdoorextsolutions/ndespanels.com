-- Create task_status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER,
  created_by INTEGER NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  priority priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_tasks_job_id ON tasks(job_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status = 'pending';

-- Index for overdue tasks query
CREATE INDEX idx_tasks_overdue ON tasks(status, due_date) 
  WHERE status = 'pending' AND due_date IS NOT NULL;
