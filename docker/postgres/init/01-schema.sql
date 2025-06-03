-- Initialize database schema for Employee Shift Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'scheduler', 'employee')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    hire_date DATE NOT NULL,
    termination_date DATE,
    yearly_hour_quota INTEGER DEFAULT 1760,
    used_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_yearly_hour_quota_positive CHECK (yearly_hour_quota > 0)
);

-- Create Positions table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    is_24x7 BOOLEAN DEFAULT FALSE,
    weekly_pattern JSONB NOT NULL,
    daily_hours INTEGER NOT NULL,
    min_staff_per_shift INTEGER NOT NULL,
    required_skills JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_min_staff_positive CHECK (min_staff_per_shift > 0),
    CONSTRAINT check_daily_hours_positive CHECK (daily_hours > 0)
);

-- Create EmployeePosition junction table
CREATE TABLE employee_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, position_id)
);

-- Create Schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    generation_method VARCHAR(20) NOT NULL CHECK (generation_method IN ('automatic', 'manual', 'mixed')),
    created_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMP,
    published_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_date_range CHECK (end_date >= start_date)
);

-- Create Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES positions(id),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    shift_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))/3600
    ) STORED,
    is_night_shift BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(HOUR FROM start_time) >= 22 OR EXTRACT(HOUR FROM start_time) < 6
    ) STORED,
    is_weekend BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(DOW FROM shift_date) = 0 OR EXTRACT(DOW FROM shift_date) = 6
    ) STORED,
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'completed', 'absent', 'modified')),
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    actual_duration_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (actual_end_time - actual_start_time))/3600
        ELSE NULL END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_shift_times CHECK (end_time > start_time),
    CONSTRAINT check_actual_shift_times CHECK (
        (actual_start_time IS NULL AND actual_end_time IS NULL) OR
        (actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL AND actual_end_time > actual_start_time)
    )
);

-- Create ShiftTemplates table
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time::timestamp - start_time::timestamp))/3600
    ) STORED,
    min_staff INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_template_times CHECK (end_time > start_time),
    CONSTRAINT check_template_min_staff CHECK (min_staff > 0)
);

-- Create EmployeeAvailability table
CREATE TABLE employee_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('available', 'preferred', 'unavailable')),
    recurrence_pattern JSONB,
    reason VARCHAR(255),
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_availability_times CHECK (end_datetime > start_datetime)
);

-- Create EmployeeViolations table
CREATE TABLE employee_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    violation_type VARCHAR(50) NOT NULL CHECK (
        violation_type IN ('daily_hours_exceeded', 'insufficient_rest', 'consecutive_days', 'yearly_quota_exceeded')
    ),
    violation_date DATE NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'minor', 'major', 'critical')),
    description TEXT NOT NULL,
    resolution_status VARCHAR(20) NOT NULL CHECK (resolution_status IN ('open', 'acknowledged', 'resolved', 'waived')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SchedulingConstraints table
CREATE TABLE scheduling_constraints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    constraint_type VARCHAR(20) NOT NULL CHECK (constraint_type IN ('legal', 'organizational', 'preference')),
    priority INTEGER NOT NULL,
    rule_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ScheduleChangeRequests table
CREATE TABLE schedule_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    requested_date DATE,
    requested_start_time TIME,
    requested_end_time TIME,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('time_off', 'shift_swap', 'schedule_change')),
    reason TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_request_times CHECK (
        (requested_start_time IS NULL AND requested_end_time IS NULL) OR
        (requested_start_time IS NOT NULL AND requested_end_time IS NOT NULL AND requested_end_time > requested_start_time)
    )
);

-- Create Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL CHECK (
        report_type IN ('hours_worked', 'violations', 'coverage', 'employee_schedule')
    ),
    parameters JSONB NOT NULL,
    result_data JSONB,
    format VARCHAR(10) NOT NULL CHECK (format IN ('json', 'pdf', 'excel')),
    file_path VARCHAR(255),
    generated_by UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AuditLogs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('info', 'warning', 'alert', 'schedule_change')),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SystemSettings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('string', 'integer', 'float', 'boolean', 'json')),
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance optimization
CREATE INDEX idx_employees_employee_code ON employees(employee_code);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_name ON employees(first_name, last_name);

CREATE INDEX idx_shifts_shift_date ON shifts(shift_date);
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, shift_date);
CREATE INDEX idx_shifts_position_date ON shifts(position_id, shift_date);
CREATE INDEX idx_shifts_status ON shifts(status);

CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_date_range ON schedules(start_date, end_date);

CREATE INDEX idx_employee_availability_employee_start ON employee_availability(employee_id, start_datetime);
CREATE INDEX idx_employee_availability_type ON employee_availability(availability_type);

CREATE INDEX idx_employee_violations_date ON employee_violations(violation_date);
CREATE INDEX idx_employee_violations_employee_date ON employee_violations(employee_id, violation_date);
CREATE INDEX idx_employee_violations_status ON employee_violations(resolution_status);

-- Create views for common queries
CREATE VIEW employee_schedule_view AS
SELECT 
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    s.id AS shift_id,
    p.name AS position_name,
    s.shift_date,
    s.start_time,
    s.end_time,
    s.duration_hours,
    s.is_night_shift,
    s.is_weekend,
    s.status
FROM 
    employees e
JOIN 
    shifts s ON e.id = s.employee_id
JOIN 
    positions p ON s.position_id = p.id;

CREATE VIEW position_coverage_view AS
SELECT 
    p.id AS position_id,
    p.name AS position_name,
    s.shift_date,
    EXTRACT(HOUR FROM s.start_time) AS hour_of_day,
    COUNT(s.id) AS staff_count,
    p.min_staff_per_shift,
    CASE 
        WHEN COUNT(s.id) < p.min_staff_per_shift THEN TRUE 
        ELSE FALSE 
    END AS is_understaffed
FROM 
    positions p
JOIN 
    shifts s ON p.id = s.position_id
GROUP BY 
    p.id, p.name, s.shift_date, EXTRACT(HOUR FROM s.start_time), p.min_staff_per_shift;

CREATE VIEW violation_summary_view AS
SELECT 
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    ev.violation_type,
    ev.severity,
    COUNT(*) AS violation_count,
    MIN(ev.violation_date) AS first_violation_date,
    MAX(ev.violation_date) AS last_violation_date
FROM 
    employees e
JOIN 
    employee_violations ev ON e.id = ev.employee_id
GROUP BY 
    e.id, e.first_name, e.last_name, ev.violation_type, ev.severity;

CREATE VIEW hours_worked_view AS
SELECT 
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    p.id AS position_id,
    p.name AS position_name,
    EXTRACT(YEAR FROM s.shift_date) AS year,
    EXTRACT(MONTH FROM s.shift_date) AS month,
    SUM(s.duration_hours) AS scheduled_hours,
    SUM(s.actual_duration_hours) AS actual_hours,
    e.yearly_hour_quota,
    e.used_hours,
    e.yearly_hour_quota - e.used_hours AS remaining_hours
FROM 
    employees e
JOIN 
    shifts s ON e.id = s.employee_id
JOIN 
    positions p ON s.position_id = p.id
GROUP BY 
    e.id, e.first_name, e.last_name, p.id, p.name, 
    EXTRACT(YEAR FROM s.shift_date), EXTRACT(MONTH FROM s.shift_date),
    e.yearly_hour_quota, e.used_hours;

-- Insert default admin user
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    role
) VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$rPiEAgQNIT1TCoQz9Jzv/OeZAR7vXZN9XLx4Pw4VQCJNiNpLm4QDi', -- hashed 'admin123'
    'System',
    'Administrator',
    'admin'
);

-- Insert default system settings
INSERT INTO system_settings (key, value, data_type, description) VALUES
('max_daily_hours', '8', 'integer', 'Maximum hours an employee can work per day'),
('min_rest_hours', '11', 'integer', 'Minimum rest hours between shifts'),
('min_consecutive_days_off', '2', 'integer', 'Minimum consecutive days off per week'),
('default_yearly_hours', '1760', 'integer', 'Default yearly hour quota for employees'),
('night_shift_start_hour', '22', 'integer', 'Starting hour for night shift definition'),
('night_shift_end_hour', '6', 'integer', 'Ending hour for night shift definition');

-- Insert default scheduling constraints
INSERT INTO scheduling_constraints (name, description, constraint_type, priority, rule_definition, is_active) VALUES
(
    'Maximum Daily Hours',
    'No employee should work more than 8 hours per day',
    'legal',
    100,
    '{"type": "max_daily_hours", "value": 8}',
    TRUE
),
(
    'Minimum Rest Period',
    'Employees must have at least 11 hours rest between shifts',
    'legal',
    90,
    '{"type": "min_rest_hours", "value": 11}',
    TRUE
),
(
    'Consecutive Days Off',
    'Employees must have at least 2 consecutive days off per week',
    'legal',
    80,
    '{"type": "consecutive_days_off", "value": 2}',
    TRUE
),
(
    'Yearly Hours Quota',
    'Employees must not exceed their yearly hours quota',
    'organizational',
    70,
    '{"type": "yearly_quota"}',
    TRUE
),
(
    'Fair Night Shift Distribution',
    'Night shifts should be distributed fairly among eligible employees',
    'organizational',
    60,
    '{"type": "fair_distribution", "shift_type": "night"}',
    TRUE
),
(
    'Fair Weekend Distribution',
    'Weekend shifts should be distributed fairly among eligible employees',
    'organizational',
    50,
    '{"type": "fair_distribution", "shift_type": "weekend"}',
    TRUE
);
